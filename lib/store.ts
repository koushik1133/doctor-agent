import { randomUUID, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { SpecialtyId } from "./specialties";
import type { VerificationReport } from "./verification/verify";

// Persistence for the marketplace side: doctor applications and referrals.
// Uses Supabase when configured (see supabase/schema.sql), otherwise a local
// JSON file in ./data so the app runs with zero setup.

export type ApplicationStatus = "verified" | "needs_review" | "rejected";

export type DoctorApplication = {
  id: string;
  npi: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty: SpecialtyId;
  licenseState: string;
  licenseNumber: string;
  practiceZip: string;
  acceptingNew: boolean;
  weeklyCapacity: number;
  telehealth: boolean;
  languages: string[];
  bio?: string;
  status: ApplicationStatus;
  verification: VerificationReport;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  // sha256 of the doctor's private manage-link token. Issued only on approval.
  manageTokenHash?: string;
  // Set when a reviewer confirmed, out of band, that the applicant is this doctor.
  identityConfirmed?: { at: string; method: string };
  updatedAt?: string;
};

export type Outcome = { result: "better" | "same" | "worse"; rating: number; note?: string; at: string };

// A patient asking a verified doctor's office to contact them. Contact details
// are shared only with explicit consent and erased CONTACT_RETENTION_DAYS after
// the office responds (or the request expires).
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";
export type PatientContact = { name: string; phone?: string; email?: string; preferredTimes?: string; note?: string };
export type AppointmentRequest = {
  status: RequestStatus;
  contact: PatientContact | null; // null once erased
  consentAt: string;
  respondedAt?: string;
  doctorMessage?: string;
  contactErasedAt?: string;
};

export type Referral = {
  id: string;
  npi: string;
  doctorName: string;
  specialty: SpecialtyId;
  conditions: string[];
  patientZip: string;
  createdAt: string;
  outcome?: Outcome;
  request?: AppointmentRequest;
};

type FileShape = { applications: DoctorApplication[]; referrals: Referral[] };

interface Store {
  listApplications(): Promise<DoctorApplication[]>;
  getApplicationByNpi(npi: string): Promise<DoctorApplication | null>;
  saveApplication(a: DoctorApplication): Promise<void>;
  listReferrals(npis?: string[]): Promise<Referral[]>;
  getReferral(id: string): Promise<Referral | null>;
  saveReferral(r: Referral): Promise<void>;
}

class FileStore implements Store {
  private file = process.env.DATA_FILE || path.join(process.cwd(), "data", "store.json");
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileShape> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as FileShape;
    } catch {
      return { applications: [], referrals: [] };
    }
  }
  private mutate(fn: (d: FileShape) => void): Promise<void> {
    const run = this.queue.then(async () => {
      const d = await this.read();
      fn(d);
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(d, null, 2));
      await rename(tmp, this.file);
    });
    this.queue = run.catch(() => {});
    return run;
  }
  async listApplications() {
    return (await this.read()).applications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getApplicationByNpi(npi: string) {
    return (await this.read()).applications.find((a) => a.npi === npi) ?? null;
  }
  saveApplication(a: DoctorApplication) {
    return this.mutate((d) => {
      const i = d.applications.findIndex((x) => x.id === a.id);
      if (i >= 0) d.applications[i] = a;
      else d.applications.push(a);
    });
  }
  async listReferrals(npis?: string[]) {
    const all = (await this.read()).referrals;
    return npis ? all.filter((r) => npis.includes(r.npi)) : all;
  }
  async getReferral(id: string) {
    return (await this.read()).referrals.find((r) => r.id === id) ?? null;
  }
  saveReferral(r: Referral) {
    return this.mutate((d) => {
      const i = d.referrals.findIndex((x) => x.id === r.id);
      if (i >= 0) d.referrals[i] = r;
      else d.referrals.push(r);
    });
  }
}

class SupabaseStore implements Store {
  private async db() {
    const { supabaseAdmin } = await import("./supabase");
    return supabaseAdmin;
  }
  async listApplications() {
    const { data, error } = await (await this.db()).from("doctor_applications").select("data").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.data as DoctorApplication);
  }
  async getApplicationByNpi(npi: string) {
    const { data } = await (await this.db()).from("doctor_applications").select("data").eq("npi", npi).maybeSingle();
    return (data?.data as DoctorApplication) ?? null;
  }
  async saveApplication(a: DoctorApplication) {
    const { error } = await (await this.db())
      .from("doctor_applications")
      .upsert({ id: a.id, npi: a.npi, status: a.status, created_at: a.createdAt, data: a });
    if (error) throw error;
  }
  async listReferrals(npis?: string[]) {
    let q = (await this.db()).from("referrals").select("data");
    if (npis) q = q.in("npi", npis);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => r.data as Referral);
  }
  async getReferral(id: string) {
    const { data } = await (await this.db()).from("referrals").select("data").eq("id", id).maybeSingle();
    return (data?.data as Referral) ?? null;
  }
  async saveReferral(r: Referral) {
    const { error } = await (await this.db()).from("referrals").upsert({ id: r.id, npi: r.npi, created_at: r.createdAt, data: r });
    if (error) throw error;
  }
}

let instance: Store | null = null;
export function store(): Store {
  if (!instance) {
    instance = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? new SupabaseStore() : new FileStore();
  }
  return instance;
}

export const newId = () => randomUUID();

// Platform-observed success rate: share of referrals whose patient reported
// feeling better, with a Beta(2,2) prior so 1-for-1 doesn't read as 100%.
export function platformSuccess(referrals: Referral[]): { rate: number; n: number; avgRating?: number } | null {
  // Only visits a confirmed office accepted count; anyone can save a referral.
  const done = referrals.filter((r) => r.outcome && r.request?.status === "accepted");
  if (!done.length) return null;
  const wins = done.filter((r) => r.outcome!.result === "better").length;
  const rate = (wins + 2) / (done.length + 4);
  const avgRating = done.reduce((s, r) => s + r.outcome!.rating, 0) / done.length;
  return { rate, n: done.length, avgRating };
}

// ── Doctor manage links ─────────────────────────────────────────────────────
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export function newManageToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export async function findApplicationByToken(token: string): Promise<DoctorApplication | null> {
  if (!token || token.length < 20) return null;
  const want = Buffer.from(hashToken(token), "hex");
  for (const a of await store().listApplications()) {
    if (!a.manageTokenHash) continue;
    const have = Buffer.from(a.manageTokenHash, "hex");
    if (have.length === want.length && timingSafeEqual(have, want)) return a;
  }
  return null;
}

// Strip secrets before an application leaves the server.
export function publicApplication(a: DoctorApplication): Omit<DoctorApplication, "manageTokenHash"> {
  const { manageTokenHash: _h, ...rest } = a;
  return rest;
}

// Only approved doctors whose identity a reviewer confirmed may receive patient
// data. Records auto-verified by earlier versions have no confirmation and fail.
export const isActiveDoctor = (a: DoctorApplication | null | undefined): a is DoctorApplication =>
  !!a && a.status === "verified" && !!a.identityConfirmed;

// ── Capacity ────────────────────────────────────────────────────────────────
// A doctor's weekly capacity is the number of referrals they'll take in any
// rolling 7-day window.
export const WEEK_MS = 7 * 24 * 3600 * 1000;

export type Capacity = { used: number; total: number; full: boolean; accepting: boolean; nextOpening?: string };

export function capacityFor(app: Pick<DoctorApplication, "npi" | "weeklyCapacity" | "acceptingNew">, referrals: Referral[], now = Date.now()): Capacity {
  // Declined, cancelled and expired requests give the spot back.
  const recent = referrals
    .filter((r) => r.npi === app.npi && now - new Date(r.createdAt).getTime() < WEEK_MS)
    .filter((r) => r.request && ["pending", "accepted"].includes(requestStatus(r.request, now)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const used = recent.length;
  const full = used >= app.weeklyCapacity;
  const nextOpening = full && recent.length ? new Date(new Date(recent[used - app.weeklyCapacity]?.createdAt ?? recent[0].createdAt).getTime() + WEEK_MS).toISOString() : undefined;
  return { used, total: app.weeklyCapacity, full, accepting: app.acceptingNew && !full, nextOpening };
}

// ── Appointment requests ────────────────────────────────────────────────────
export const REQUEST_TTL_DAYS = 7; // unanswered requests expire
export const CONTACT_RETENTION_DAYS = 30; // contact details erased after a decision
const DAY = 24 * 3600 * 1000;

// Status as of `now`: a pending request older than REQUEST_TTL_DAYS is expired.
export function requestStatus(req: AppointmentRequest, now = Date.now()): RequestStatus {
  if (req.status === "pending" && now - Date.parse(req.consentAt) > REQUEST_TTL_DAYS * DAY) return "expired";
  return req.status;
}

// Returns the referral with contact details erased if they're past retention.
// `changed` tells the caller to persist the erasure.
export function applyRetention(r: Referral, now = Date.now()): { referral: Referral; changed: boolean } {
  const req = r.request;
  if (!req || !req.contact) return { referral: r, changed: false };
  const status = requestStatus(req, now);
  const decidedAt =
    status === "expired" ? Date.parse(req.consentAt) + REQUEST_TTL_DAYS * DAY : req.respondedAt ? Date.parse(req.respondedAt) : null;
  if (status === "pending" || decidedAt === null || now - decidedAt < CONTACT_RETENTION_DAYS * DAY) {
    return { referral: status === req.status ? r : { ...r, request: { ...req, status } }, changed: status !== req.status };
  }
  return { referral: { ...r, request: { ...req, status, contact: null, contactErasedAt: new Date(now).toISOString() } }, changed: true };
}

// Apply retention to a list and persist any erasures.
export async function withRetention(list: Referral[]): Promise<Referral[]> {
  const out: Referral[] = [];
  for (const r of list) {
    const { referral, changed } = applyRetention(r);
    if (changed) await store().saveReferral(referral);
    out.push(referral);
  }
  return out;
}

// Median hours a doctor's office takes to answer requests (null if < 3 answers).
export function medianResponseHours(referrals: Referral[]): number | null {
  const hrs = referrals
    .filter((r) => r.request?.respondedAt && ["accepted", "declined"].includes(r.request.status))
    .map((r) => (Date.parse(r.request!.respondedAt!) - Date.parse(r.request!.consentAt)) / 3600000)
    .sort((a, b) => a - b);
  if (hrs.length < 3) return null;
  const m = Math.floor(hrs.length / 2);
  return hrs.length % 2 ? hrs[m] : (hrs[m - 1] + hrs[m]) / 2;
}

// Erase expired contact details everywhere, not only for records someone opens.
// Runs hourly from instrumentation.ts; on serverless hosts call it from a cron.
export async function purgeExpiredContacts(): Promise<void> {
  await withRetention(await store().listReferrals());
}

import { describe, expect, it, beforeEach } from "vitest";
import { rm } from "node:fs/promises";
import { capacityFor, newManageToken, hashToken, findApplicationByToken, publicApplication, store, WEEK_MS, type DoctorApplication, type Referral } from "@/lib/store";

const now = Date.parse("2026-11-17T12:00:00Z");
const ref = (npi: string, daysAgo: number): Referral => ({
  id: `${npi}-${daysAgo}`,
  npi,
  doctorName: "Dr. X",
  specialty: "cardiology",
  conditions: [],
  patientZip: "94110",
  createdAt: new Date(now - daysAgo * 24 * 3600 * 1000).toISOString(),
});

describe("weekly capacity", () => {
  const doc = { npi: "1", weeklyCapacity: 3, acceptingNew: true };
  it("counts only referrals in the last 7 days", () => {
    const c = capacityFor(doc, [ref("1", 1), ref("1", 2), ref("1", 9), ref("2", 1)], now);
    expect(c).toMatchObject({ used: 2, total: 3, full: false, accepting: true });
  });
  it("marks a doctor full and says when a spot opens", () => {
    const c = capacityFor(doc, [ref("1", 6), ref("1", 2), ref("1", 1)], now);
    expect(c.full).toBe(true);
    expect(c.accepting).toBe(false);
    // Oldest referral (6 days ago) ages out one day from now.
    expect(Date.parse(c.nextOpening!) - now).toBe(WEEK_MS - 6 * 24 * 3600 * 1000);
  });
  it("respects a paused doctor even with free capacity", () => {
    expect(capacityFor({ ...doc, acceptingNew: false }, [], now).accepting).toBe(false);
  });
  it("treats a zero limit as full", () => {
    expect(capacityFor({ ...doc, weeklyCapacity: 0 }, [], now).full).toBe(true);
  });
});

describe("manage links", () => {
  beforeEach(async () => {
    await rm(process.env.DATA_FILE!, { force: true });
  });
  it("stores only a hash and finds the application by token", async () => {
    const { token, hash } = newManageToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hash).toBe(hashToken(token));
    const app = { id: "a1", npi: "1234567893", manageTokenHash: hash } as DoctorApplication;
    await store().saveApplication({ ...app, createdAt: new Date().toISOString() });
    expect((await findApplicationByToken(token))?.id).toBe("a1");
    expect(await findApplicationByToken(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(await findApplicationByToken("")).toBeNull();
    expect("manageTokenHash" in publicApplication(app)).toBe(false);
  });
});

import { requestStatus, applyRetention, medianResponseHours, REQUEST_TTL_DAYS, CONTACT_RETENTION_DAYS, type AppointmentRequest } from "@/lib/store";

describe("appointment requests", () => {
  const DAY = 24 * 3600 * 1000;
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  const req = (over: Partial<AppointmentRequest> = {}): AppointmentRequest => ({
    status: "pending",
    consentAt: new Date(t0).toISOString(),
    contact: { name: "Pat Test", phone: "555 0100" },
    ...over,
  });
  const withReq = (r: AppointmentRequest, daysAgo = 0) => ({ ...ref("1", daysAgo), request: r });

  it("expires unanswered requests after the TTL", () => {
    expect(requestStatus(req(), t0 + (REQUEST_TTL_DAYS - 1) * DAY)).toBe("pending");
    expect(requestStatus(req(), t0 + (REQUEST_TTL_DAYS + 1) * DAY)).toBe("expired");
  });

  it("erases contact details only after the retention window", () => {
    const answered = req({ status: "accepted", respondedAt: new Date(t0 + DAY).toISOString() });
    expect(applyRetention(withReq(answered), t0 + 10 * DAY).referral.request!.contact).not.toBeNull();
    const later = applyRetention(withReq(answered), t0 + (CONTACT_RETENTION_DAYS + 2) * DAY);
    expect(later.changed).toBe(true);
    expect(later.referral.request!.contact).toBeNull();
    expect(later.referral.request!.contactErasedAt).toBeTruthy();
  });

  it("keeps contact details while a request is still pending", () => {
    expect(applyRetention(withReq(req()), t0 + 2 * DAY).referral.request!.contact).not.toBeNull();
  });

  it("gives the weekly spot back when a request is declined", () => {
    const doc = { npi: "1", weeklyCapacity: 1, acceptingNew: true };
    const declined = withReq(req({ status: "declined", consentAt: new Date(now - DAY).toISOString(), respondedAt: new Date(now).toISOString() }), 1);
    const pending = withReq(req({ consentAt: new Date(now - DAY).toISOString() }), 1);
    expect(capacityFor(doc, [declined], now).accepting).toBe(true);
    expect(capacityFor(doc, [pending], now).accepting).toBe(false);
  });

  it("reports a median reply time once there are enough answers", () => {
    const answered = (h: number) => withReq(req({ status: "accepted", respondedAt: new Date(t0 + h * 3600000).toISOString() }));
    expect(medianResponseHours([answered(2), answered(5)])).toBeNull();
    expect(medianResponseHours([answered(2), answered(5), answered(30)])).toBe(5);
  });
});

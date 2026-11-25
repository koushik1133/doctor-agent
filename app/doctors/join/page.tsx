"use client";

import { useState } from "react";
import { SPECIALTY_LIST, type SpecialtyId } from "@/lib/specialties";
import type { VerificationReport } from "@/lib/verification/verify";
import { CheckList } from "@/components/CheckList";

type Form = {
  npi: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: SpecialtyId | "";
  licenseState: string;
  licenseNumber: string;
  practiceZip: string;
  acceptingNew: boolean;
  weeklyCapacity: number;
  telehealth: boolean;
  languages: string;
  bio: string;
};

const EMPTY: Form = {
  npi: "", firstName: "", lastName: "", email: "", phone: "", specialty: "", licenseState: "", licenseNumber: "",
  practiceZip: "", acceptingNew: true, weeklyCapacity: 10, telehealth: false, languages: "English", bio: "",
};

const DECISION = {
  needs_review: { title: "Application received", body: "Registry details are public, so a reviewer will call the office number in your NPPES record to confirm it's you. You'll get your private practice link then.", tone: "border-warn/60 bg-warn-wash" },
  rejected: { title: "We couldn't verify this application", body: "A required identity check failed. Fix the item marked below and apply again.", tone: "border-alert/50 bg-alert-wash" },
} as const;

export default function JoinPage() {
  const [f, setF] = useState<Form>(EMPTY);
  const [lookup, setLookup] = useState<{ state: "idle" | "loading" | "found" | "error"; msg?: string }>({ state: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: keyof typeof DECISION; verification: VerificationReport} | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function doLookup() {
    setLookup({ state: "loading" });
    const res = await fetch(`/api/doctors/lookup?npi=${f.npi}`);
    const data = await res.json();
    if (!res.ok) return setLookup({ state: "error", msg: data.error });
    setF((p) => ({
      ...p,
      firstName: data.firstName,
      lastName: data.lastName,
      specialty: data.specialty ?? p.specialty,
      licenseState: data.licenseState ?? p.licenseState,
      practiceZip: data.practiceZip || p.practiceZip,
    }));
    setLookup({ state: "found", msg: `${data.firstName} ${data.lastName}${data.credential ? `, ${data.credential}` : ""} — ${data.taxonomy ?? "no taxonomy"} · ${data.city}, ${data.state}` });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/doctors/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...f,
        phone: f.phone || undefined,
        bio: f.bio || undefined,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error);
    setResult(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    const d = DECISION[result.status];
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6">
        <div className={`rounded-xl border-2 p-6 ${d.tone}`}>
          <h1 className="text-[32px] font-semibold">{d.title}</h1>
          <p className="mt-2 text-ink-2">{d.body}</p>
        </div>
        <h2 className="mt-10 text-[22px] font-semibold">What we checked</h2>
        <p className="mt-1 text-[14px] text-ink-2">Against the CMS NPI Registry and CMS Doctors &amp; Clinicians data on {new Date(result.verification.checkedAt).toLocaleString()}.</p>
        <div className="mt-6">
          <CheckList checks={result.verification.checks} />
        </div>
        <button type="button" onClick={() => { setResult(null); setF(EMPTY); setLookup({ state: "idle" }); }} className="mt-10 rounded-lg border border-ink px-4 py-2 font-bold">
          Start another application
        </button>
      </main>
    );
  }

  const input = "w-full rounded-lg border border-rule bg-surface px-3 py-2 focus:border-pine focus:outline-none";
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-16">
      <div>
        <h1 className="max-w-[16ch] text-[clamp(2rem,4.6vw,3.25rem)] font-semibold">Get referrals from patients who need your specialty</h1>
        <p className="mt-4 max-w-[60ch] text-ink-2">
          Patients upload their records and we match them to the right specialist nearby. Apply with your NPI — we check it against the
          federal registry, confirm it's you by phone, and you set how many new patients you can take each week.
        </p>

        {error && <div role="alert" className="mt-6 rounded-lg border border-alert/40 bg-alert-wash px-4 py-3 text-[15px]">{error}</div>}

        <form onSubmit={submit} className="mt-10 grid gap-8">
          <fieldset className="grid gap-4">
            <legend className="mb-2 font-display text-[20px] font-semibold">Identity</legend>
            <div>
              <label htmlFor="npi" className="text-[14px] font-bold">Individual NPI</label>
              <div className="mt-1 flex gap-2">
                <input id="npi" required inputMode="numeric" pattern="\d{10}" value={f.npi} onChange={(e) => { set("npi", e.target.value.replace(/\D/g, "").slice(0, 10)); setLookup({ state: "idle" }); }} className={`${input} max-w-[14rem] tabular-nums`} placeholder="10 digits" />
                <button type="button" onClick={doLookup} disabled={f.npi.length !== 10 || lookup.state === "loading"} className="rounded-lg border border-ink px-4 font-bold disabled:opacity-40">
                  {lookup.state === "loading" ? "Looking up…" : "Fill from registry"}
                </button>
              </div>
              {lookup.msg && <p className={`mt-2 text-[14px] ${lookup.state === "error" ? "text-alert" : "text-pine"}`}>{lookup.msg}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name"><input required value={f.firstName} onChange={(e) => set("firstName", e.target.value)} className={input} autoComplete="given-name" /></Field>
              <Field label="Last name"><input required value={f.lastName} onChange={(e) => set("lastName", e.target.value)} className={input} autoComplete="family-name" /></Field>
              <Field label="Work email"><input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={input} autoComplete="email" /></Field>
              <Field label="Phone (optional)"><input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={input} autoComplete="tel" /></Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-2 font-display text-[20px] font-semibold">Credentials</legend>
            <Field label="Specialty">
              <select required value={f.specialty} onChange={(e) => set("specialty", e.target.value as SpecialtyId)} className={input}>
                <option value="">Choose…</option>
                {SPECIALTY_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr_9rem]">
              <Field label="License state"><input required maxLength={2} value={f.licenseState} onChange={(e) => set("licenseState", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} className={input} placeholder="CA" /></Field>
              <Field label="License number"><input required value={f.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} className={input} /></Field>
              <Field label="Practice ZIP"><input required inputMode="numeric" pattern="\d{5}" value={f.practiceZip} onChange={(e) => set("practiceZip", e.target.value.replace(/\D/g, "").slice(0, 5))} className={`${input} tabular-nums`} /></Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-2 font-display text-[20px] font-semibold">Availability</legend>
            <label className="flex items-center gap-3"><input type="checkbox" checked={f.acceptingNew} onChange={(e) => set("acceptingNew", e.target.checked)} className="h-4 w-4 accent-[var(--pine)]" /> Accepting new patients</label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={f.telehealth} onChange={(e) => set("telehealth", e.target.checked)} className="h-4 w-4 accent-[var(--pine)]" /> Offer video visits</label>
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <Field label="New patients per week"><input type="number" min={0} max={200} value={f.weeklyCapacity} onChange={(e) => set("weeklyCapacity", Number(e.target.value))} className={`${input} tabular-nums`} /></Field>
              <Field label="Languages (comma-separated)"><input value={f.languages} onChange={(e) => set("languages", e.target.value)} className={input} /></Field>
            </div>
            <Field label="Short bio for patients (optional)">
              <textarea rows={3} maxLength={800} value={f.bio} onChange={(e) => set("bio", e.target.value)} className={input} placeholder="Focus areas, approach, what patients can expect at a first visit." />
            </Field>
          </fieldset>

          <div>
            <button type="submit" disabled={submitting} className="rounded-lg bg-pine px-6 py-3 font-bold text-pine-ink disabled:opacity-50">
              {submitting ? "Verifying with NPPES…" : "Apply and verify"}
            </button>
            <p className="mt-3 max-w-[60ch] text-[13px] text-ink-3">By applying you confirm the details are yours. We confirm every applicant by calling the office listed in NPPES.</p>
          </div>
        </form>
      </div>

      <aside className="mt-16 lg:mt-24">
        <div className="rounded-xl border border-rule bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-[20px] font-semibold">How verification works</h2>
          <ol className="mt-4 grid gap-4 text-[15px]">
            {[
              ["Check digit", "Your NPI's Luhn check digit is validated."],
              ["Registry match", "Name, active status, taxonomy and license are compared to your NPPES record."],
              ["CMS footprint", "We look for your MIPS score and hospital affiliations."],
              ["Identity call", "A reviewer calls your office number from NPPES before you receive any patient requests."],
            ].map(([t, b], i) => (
              <li key={t} className="grid grid-cols-[1.5rem_1fr] gap-3">
                <span className="font-display font-semibold text-ink-3">{i + 1}</span>
                <span><span className="block font-bold">{t}</span><span className="text-ink-2">{b}</span></span>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-rule pt-4 text-[14px] text-ink-2">
            Ranking uses public outcome data, and once patients see you, their reported results. Being verified adds a badge and a small fit
            boost — it never outranks better outcomes.
          </p>
        </div>
      </aside>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[14px] font-bold">{label}</span>
      {children}
    </label>
  );
}


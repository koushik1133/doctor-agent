"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DoctorApplication, Capacity } from "@/lib/store";
import { SPECIALTIES } from "@/lib/specialties";
import { CheckList } from "@/components/CheckList";

type Data = {
  application: Omit<DoctorApplication, "manageTokenHash">;
  capacity: Capacity;
  success: { rate: number; n: number; avgRating?: number } | null;
  referrals: { id: string; createdAt: string; conditions: string[]; patientZip: string; outcome: { result: string; rating: number; at: string } | null }[];
};

const STATUS = {
  verified: { label: "Verified — visible to patients", tone: "bg-pine text-pine-ink" },
  needs_review: { label: "Waiting for manual review", tone: "bg-warn-wash text-warn border border-warn/50" },
  rejected: { label: "Not verified", tone: "bg-alert-wash text-alert border border-alert/40" },
} as const;

// The private token lives in the URL fragment (#…), which browsers never send
// to the server or include in Referer headers.
function readToken(): string {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

export default function ManagePage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ acceptingNew: true, weeklyCapacity: 10, telehealth: false, languages: "", bio: "", phone: "" });

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/doctors/manage", { headers: { "x-manage-token": t } });
    const d = await res.json();
    if (!res.ok) return setError(d.error);
    setData(d);
    const a = d.application;
    setForm({ acceptingNew: a.acceptingNew, weeklyCapacity: a.weeklyCapacity, telehealth: a.telehealth, languages: a.languages.join(", "), bio: a.bio ?? "", phone: a.phone ?? "" });
  }, []);

  useEffect(() => {
    const t = readToken();
    setToken(t);
    if (t) load(t);
    else setError("Open this page from the private manage link you got when you applied.");
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/doctors/manage", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-manage-token": token },
      body: JSON.stringify({ ...form, languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error);
    setData((prev) => (prev ? { ...prev, application: d.application, capacity: d.capacity } : prev));
    setSaved(true);
  }

  if (error && !data)
    return (
      <main className="mx-auto max-w-xl px-4 pt-16">
        <h1 className="text-[28px] font-semibold">Can&apos;t open your practice page</h1>
        <p className="mt-2 text-ink-2">{error}</p>
        <p className="mt-4 text-[15px]">
          New here? <Link href="/doctors/join" className="text-pine underline">Apply to receive referrals</Link>.
        </p>
      </main>
    );
  if (!data) return <main className="mx-auto max-w-xl px-4 pt-16 text-ink-2">Loading your practice…</main>;

  const a = data.application;
  const c = data.capacity;
  const st = STATUS[a.status];
  const pct = c.total ? Math.min(1, c.used / c.total) : 1;
  const input = "w-full rounded-lg border border-rule bg-surface px-3 py-2 focus:border-pine focus:outline-none";
  const outcomes = data.referrals.filter((r) => r.outcome);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-semibold">
          Dr. {a.firstName} {a.lastName}
        </h1>
        <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${st.tone}`}>{st.label}</span>
      </div>
      <p className="mt-2 text-ink-2">
        {SPECIALTIES[a.specialty]?.label} · NPI {a.npi} · {a.licenseState} {a.practiceZip}
      </p>

      <section aria-labelledby="week" className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-xl border border-rule bg-surface p-6">
          <h2 id="week" className="text-[20px] font-semibold">This week</h2>
          <p className="mt-4 font-display text-[44px] font-semibold leading-none tabular-nums">
            {c.used}
            <span className="text-[22px] text-ink-3"> / {c.total} new patients</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-rule" role="meter" aria-valuenow={c.used} aria-valuemin={0} aria-valuemax={c.total} aria-label="Referrals used this week">
            <div className={`h-full rounded-full ${c.full ? "bg-warn" : "bg-pine"}`} style={{ width: `${pct * 100}%` }} />
          </div>
          <p className="mt-3 text-[15px] text-ink-2">
            {!a.acceptingNew
              ? "You're hidden from new referrals. Turn on “Accepting new patients” to start receiving them."
              : c.full
              ? `You're full for now — patients see you as unavailable${c.nextOpening ? ` until ${new Date(c.nextOpening).toLocaleDateString()}` : ""}. Raise your weekly limit to take more.`
              : `${c.total - c.used} more referral${c.total - c.used === 1 ? "" : "s"} available in the rolling 7-day window.`}
          </p>
        </div>
        <div className="rounded-xl border border-rule bg-surface p-6">
          <h2 className="text-[20px] font-semibold">Patient-reported outcomes</h2>
          {data.success ? (
            <>
              <p className="mt-4 font-display text-[44px] font-semibold leading-none tabular-nums text-pine">{Math.round(data.success.rate * 100)}%</p>
              <p className="mt-2 text-[14px] text-ink-2">
                improvement rate across {data.success.n} report{data.success.n > 1 ? "s" : ""}
                {data.success.avgRating ? `, average rating ${data.success.avgRating.toFixed(1)}★` : ""}. Small samples are pulled toward 50% until more patients report back.
              </p>
            </>
          ) : (
            <p className="mt-3 text-[15px] text-ink-2">No reports yet. Patients are asked how they&apos;re doing after their visit; their answers show up here and feed your ranking.</p>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="refs">
          <h2 id="refs" className="text-[22px] font-semibold">Referrals</h2>
          <p className="mt-1 text-[14px] text-ink-2">Patients contact your office directly. We share only the conditions their records pointed to and their ZIP code.</p>
          {data.referrals.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-rule p-6 text-ink-2">
              No referrals yet. You&apos;ll appear when a nearby patient&apos;s records point to {SPECIALTIES[a.specialty]?.label.toLowerCase()}.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-surface">
              <table className="w-full min-w-[34rem] text-[15px]">
                <thead className="border-b border-rule text-left text-[13px] text-ink-3">
                  <tr>
                    <th className="px-4 py-2 font-normal">Date</th>
                    <th className="px-4 py-2 font-normal">Conditions</th>
                    <th className="px-4 py-2 font-normal">ZIP</th>
                    <th className="px-4 py-2 font-normal">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {data.referrals.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">{r.conditions.slice(0, 3).join(", ") || "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums">{r.patientZip}</td>
                      <td className="px-4 py-2.5">
                        {r.outcome ? (
                          <span className={r.outcome.result === "better" ? "text-pine" : r.outcome.result === "worse" ? "text-alert" : "text-ink-2"}>
                            {r.outcome.result === "better" ? "Better" : r.outcome.result === "worse" ? "Worse" : "Same"} · {r.outcome.rating}★
                          </span>
                        ) : (
                          <span className="text-ink-3">Not reported</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {outcomes.length > 0 && <p className="mt-2 text-[13px] text-ink-3">{outcomes.length} of {data.referrals.length} patients have reported back.</p>}

          <details className="mt-10">
            <summary className="cursor-pointer text-[15px] font-bold">Verification details</summary>
            <div className="mt-4">
              <CheckList checks={a.verification.checks} />
            </div>
          </details>
        </section>

        <form onSubmit={save} className="grid content-start gap-4 rounded-xl border border-rule bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-[20px] font-semibold">Availability</h2>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.acceptingNew} onChange={(e) => setForm({ ...form, acceptingNew: e.target.checked })} className="h-4 w-4 accent-[var(--pine)]" />
            Accepting new patients
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.telehealth} onChange={(e) => setForm({ ...form, telehealth: e.target.checked })} className="h-4 w-4 accent-[var(--pine)]" />
            Offer video visits
          </label>
          <label className="grid gap-1">
            <span className="text-[14px] font-bold">New patients per week</span>
            <input type="number" min={0} max={200} value={form.weeklyCapacity} onChange={(e) => setForm({ ...form, weeklyCapacity: Number(e.target.value) })} className={`${input} tabular-nums`} />
          </label>
          <label className="grid gap-1">
            <span className="text-[14px] font-bold">Office phone</span>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1">
            <span className="text-[14px] font-bold">Languages</span>
            <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1">
            <span className="text-[14px] font-bold">Bio for patients</span>
            <textarea rows={4} maxLength={800} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={input} />
          </label>
          <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2.5 font-bold text-pine-ink disabled:opacity-50">
            {saving ? "Saving…" : "Save availability"}
          </button>
          {saved && <p role="status" className="text-[14px] text-pine">Availability saved.</p>}
          {error && <p role="alert" className="text-[14px] text-alert">{error}</p>}
          <p className="text-[13px] text-ink-3">To change your name, license or specialty, submit a new application — those are re-verified against NPPES.</p>
        </form>
      </div>
    </main>
  );
}

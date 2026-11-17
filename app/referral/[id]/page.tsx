"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Referral } from "@/lib/store";
import { SPECIALTIES } from "@/lib/specialties";

const RESULTS = [
  { id: "better", label: "Better", hint: "The visit helped" },
  { id: "same", label: "About the same", hint: "No real change yet" },
  { id: "worse", label: "Worse", hint: "Things didn't improve" },
] as const;

export default function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [r, setR] = useState<Referral | null>(null);
  const [missing, setMissing] = useState(false);
  const [result, setResult] = useState<(typeof RESULTS)[number]["id"] | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/referrals/${id}`).then(async (res) => (res.ok ? setR(await res.json()) : setMissing(true)));
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/referrals/${id}/outcome`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ result, rating, note: note || undefined }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setDone(true);
  }

  if (missing) return <main className="mx-auto max-w-xl px-4 pt-16"><h1 className="text-[28px] font-semibold">This follow-up link isn&apos;t valid</h1><p className="mt-2 text-ink-2">Check the link, or <Link href="/find" className="text-pine underline">start a new search</Link>.</p></main>;
  if (!r) return <main className="mx-auto max-w-xl px-4 pt-16 text-ink-2">Loading…</main>;

  const already = r.outcome || done;
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6">
      <p className="text-[14px] text-ink-3">Referral saved {new Date(r.createdAt).toLocaleDateString()}</p>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.5rem)] font-semibold">How did it go with {r.doctorName}?</h1>
      <p className="mt-3 text-ink-2">
        {SPECIALTIES[r.specialty]?.label} · for {r.conditions.slice(0, 3).join(", ").toLowerCase() || "your visit"}. Your answer is anonymous and feeds the
        doctor&apos;s outcome score for future patients. Bookmark this page and come back after your visit.
      </p>

      {already ? (
        <div className="mt-8 rounded-xl border border-pine bg-pine-wash p-5">
          <p className="font-bold">Thanks — your outcome is recorded.</p>
          <p className="mt-1 text-[15px] text-ink-2">It now counts toward this doctor&apos;s ranking.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-6">
          <fieldset>
            <legend className="font-bold">Since the visit, are you feeling…</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {RESULTS.map((o) => (
                <label key={o.id} className={`cursor-pointer rounded-lg border px-3 py-3 ${result === o.id ? "border-pine bg-pine-wash" : "border-rule bg-surface"}`}>
                  <input type="radio" name="result" className="sr-only" checked={result === o.id} onChange={() => setResult(o.id)} />
                  <span className="block font-bold">{o.label}</span>
                  <span className="text-[13px] text-ink-2">{o.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-bold">Rate the doctor</legend>
            <div className="mt-2 flex gap-1" role="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`text-[32px] leading-none ${n <= rating ? "text-pine" : "text-rule"}`}>
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1">
            <span className="font-bold">Anything to add? (optional)</span>
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-rule bg-surface px-3 py-2 focus:border-pine focus:outline-none" />
          </label>
          {error && <p role="alert" className="text-alert">{error}</p>}
          <button type="submit" disabled={!result || !rating} className="justify-self-start rounded-lg bg-pine px-5 py-3 font-bold text-pine-ink disabled:opacity-40">Record my outcome</button>
        </form>
      )}
    </main>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/analysis/engine";
import type { MatchResponse, MatchedDoctor } from "@/lib/matching/match";
import type { SpecialtyId } from "@/lib/specialties";
import { HighlightedDoc } from "@/components/HighlightedDoc";
import { ScoreStrip } from "@/components/ScoreStrip";
import { VisitSummary } from "@/components/VisitSummary";

type AnalysisResponse = Analysis & { documents: { name: string; method: string; chars: number }[] };

const SAMPLES = [
  { file: "diabetes-labs.txt", label: "Lab report" },
  { file: "cardiology-note.txt", label: "Cardiology visit note" },
  { file: "ortho-mri.txt", label: "Knee MRI" },
];

const STEPS = ["Add your records", "Check what we found", "Choose a doctor"];

export default function FindPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<null | "analyze" | "match">(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [specialty, setSpecialty] = useState<SpecialtyId | null>(null);
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [results, setResults] = useState<MatchResponse | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<MatchedDoctor | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const step = results ? 2 : analysis ? 1 : 0;

  const addFiles = useCallback((list: FileList | File[]) => {
    setError(null);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
      return next.slice(0, 8);
    });
  }, []);

  async function loadSample(name: string) {
    const res = await fetch(`/samples/${name}`);
    const blob = await res.blob();
    addFiles([new File([blob], name, { type: "text/plain" })]);
  }

  async function runAnalysis() {
    setBusy("analyze");
    setError(null);
    setResults(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("notes", notes);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "We couldn't read those files.");
      setAnalysis(data);
      setSpecialty(data.specialties[0]?.id ?? "primary_care");
      requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function runMatch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!specialty) return;
    setBusy("match");
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zip, specialty, radiusMiles: radius, limit: 60 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    {analysis && <VisitSummary analysis={analysis} notes={notes} doctor={chosen} />}
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 print:hidden lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
      <aside className="mb-8 lg:mb-0">
        <ol className="flex gap-4 overflow-x-auto text-[14px] lg:sticky lg:top-24 lg:flex-col lg:gap-5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-3" aria-current={i === step ? "step" : undefined}>
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border text-[13px] font-bold ${
                  i < step ? "border-pine bg-pine text-pine-ink" : i === step ? "border-ink text-ink" : "border-rule text-ink-3"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={i === step ? "font-bold text-ink" : "text-ink-2"}>{s}</span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0">
        <h1 className="max-w-[18ch] text-[clamp(2rem,4.6vw,3.25rem)] font-semibold">Find the specialist your records point to</h1>
        <p className="mt-4 max-w-[62ch] text-ink-2">
          Upload lab results, visit notes, or imaging reports. We read them in memory — nothing is stored — work out which kind of
          specialist you need, then rank doctors near you on public Medicare quality and outcome data.
        </p>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-alert/40 bg-alert-wash px-4 py-3 text-[15px] text-ink">
            {error}
          </div>
        )}

        {/* Step 1 */}
        <section aria-labelledby="s1" className="mt-10">
          <h2 id="s1" className="sr-only">Add your records</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-pine bg-pine-wash" : "border-rule bg-surface"}`}
          >
            <p className="font-display text-[22px] font-semibold">Drop files here</p>
            <p className="mt-1 text-[15px] text-ink-2">PDF, Word, or text — up to 8 files, 10 MB each. Photos work when OCR is configured.</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 rounded-lg border border-ink px-4 py-2 text-[15px] font-bold hover:bg-ink hover:text-paper"
            >
              Choose files
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-ink-2">
            <span>No records handy? Try a sample:</span>
            {SAMPLES.map((s) => (
              <button key={s.file} type="button" onClick={() => loadSample(s.file)} className="rounded-full border border-rule bg-surface px-3 py-1 hover:border-pine hover:text-ink">
                {s.label}
              </button>
            ))}
          </div>

          {files.length > 0 && (
            <ul className="mt-5 divide-y divide-rule rounded-lg border border-rule bg-surface">
              {files.map((f) => (
                <li key={f.name + f.size} className="flex items-center gap-3 px-4 py-2.5 text-[15px]">
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-[13px] text-ink-3">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => setFiles((p) => p.filter((x) => x !== f))} className="text-[13px] text-ink-2 underline underline-offset-2 hover:text-alert" aria-label={`Remove ${f.name}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-6 block">
            <span className="text-[15px] font-bold">Anything the records don&apos;t say?</span>
            <span className="block text-[14px] text-ink-2">Symptoms, how long you&apos;ve had them, what you&apos;re worried about.</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="e.g. Knee has been swelling after runs for two months."
              className="mt-2 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[15px] placeholder:text-ink-3 focus:border-pine focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={busy !== null || (!files.length && notes.trim().length < 10)}
            className="mt-5 rounded-lg bg-pine px-5 py-3 font-bold text-pine-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "analyze" ? "Reading your records…" : "Read my records"}
          </button>
        </section>

        {/* Step 2 */}
        {analysis && (
          <section ref={reviewRef} aria-labelledby="s2" className="mt-16 scroll-mt-24 border-t border-rule pt-10">
            <h2 id="s2" className="text-[28px] font-semibold">Here&apos;s what we found</h2>
            <p className="mt-2 text-[15px] text-ink-2">
              {analysis.documents.length ? `${analysis.documents.length} document${analysis.documents.length > 1 ? "s" : ""}, ` : ""}
              {analysis.wordCount.toLocaleString()} words read. Highlighted passages are what drove the recommendation — hover one to see what it means.
            </p>
            <button type="button" onClick={() => window.print()} className="mt-3 text-[15px] font-bold text-pine underline underline-offset-4">
              Print a summary for your doctor
            </button>

            {analysis.urgency === "emergency" && (
              <div role="alert" className="mt-6 rounded-xl border-2 border-alert bg-alert-wash p-5">
                <p className="font-display text-[22px] font-semibold text-alert">Don&apos;t wait for an appointment</p>
                <p className="mt-1 text-ink">
                  Your records mention {analysis.redFlags.join(", ").toLowerCase()}. If this is happening now, call 911 or go to the nearest emergency room.
                </p>
              </div>
            )}
            {analysis.urgency === "soon" && (
              <div className="mt-6 rounded-xl border border-warn/50 bg-warn-wash p-5">
                <p className="font-bold text-ink">Some results need prompt attention</p>
                <p className="mt-1 text-[15px] text-ink-2">
                  {analysis.labs.filter((l) => l.severity === "critical").map((l) => `${l.name} ${l.value} ${l.unit}`).join(", ")} — contact your doctor
                  within a day or two rather than waiting weeks for a specialist.
                </p>
              </div>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="rounded-xl border border-rule bg-surface">
                <div className="flex items-center justify-between border-b border-rule px-5 py-3 text-[13px] text-ink-3">
                  <span>Your record</span>
                  <span>{analysis.spans.length} highlights</span>
                </div>
                <div className="max-h-[32rem] overflow-auto px-5 py-4">
                  <HighlightedDoc text={analysis.text} spans={analysis.spans} active={active} onSelect={setActive} />
                </div>
              </div>

              <div className="grid content-start gap-8">
                {analysis.conditions.length > 0 && (
                  <div>
                    <h3 className="text-[18px] font-semibold">Conditions</h3>
                    <ul className="mt-3 grid gap-2">
                      {analysis.conditions.map((c) => (
                        <li
                          key={c.id}
                          onMouseEnter={() => setActive(c.name)}
                          onMouseLeave={() => setActive(null)}
                          className={`rounded-lg border px-3 py-2 text-[15px] transition-colors ${active === c.name ? "border-ink" : "border-rule"} bg-surface`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-bold">{c.name}</span>
                            {c.context !== "current" && (
                              <span className="text-[13px] text-ink-3">{c.context === "family" ? "family history" : "past history"}</span>
                            )}
                          </div>
                          <div className="text-[13px] text-ink-3">
                            ICD-10 {c.icd10}
                            {c.icd10Verified ? " · checked against NLM ICD-10-CM" : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.labs.length > 0 && (
                  <div>
                    <h3 className="text-[18px] font-semibold">Results outside the normal range</h3>
                    <table className="mt-3 w-full text-[15px]">
                      <tbody className="divide-y divide-rule">
                        {analysis.labs.map((l) => (
                          <tr key={l.id}>
                            <td className="py-2 pr-3 font-bold">{l.name}</td>
                            <td className="py-2 pr-3 tabular-nums">
                              {l.value} <span className="text-ink-3">{l.unit}</span>
                            </td>
                            <td className={`py-2 text-[14px] ${l.severity === "critical" ? "font-bold text-alert" : "text-ink-2"}`}>{l.label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {analysis.procedures.length > 0 && (
                  <div>
                    <h3 className="text-[18px] font-semibold">Procedures and tests mentioned</h3>
                    <ul className="mt-2 flex flex-wrap gap-2 text-[14px]">
                      {analysis.procedures.map((p) => (
                        <li key={p.id} className="rounded-full border border-rule bg-surface px-3 py-1 text-ink-2" title={p.evidence}>
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!analysis.conditions.length && !analysis.labs.length && (
                  <p className="rounded-lg border border-rule bg-surface p-4 text-[15px] text-ink-2">
                    We didn&apos;t find a specific diagnosis or abnormal result. A primary care doctor is the right first stop — they can refer you on.
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={runMatch} className="mt-10 rounded-xl border border-rule bg-surface p-5 sm:p-6">
              <fieldset>
                <legend className="font-display text-[20px] font-semibold">Which specialist?</legend>
                <p className="mt-1 text-[14px] text-ink-2">Ranked by how strongly your records point to each one. You can pick a different one.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {analysis.specialties.slice(0, 6).map((s, i) => (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors ${specialty === s.id ? "border-pine bg-pine-wash" : "border-rule hover:border-ink-3"}`}
                    >
                      <input type="radio" name="specialty" value={s.id} checked={specialty === s.id} onChange={() => setSpecialty(s.id)} className="mt-1 accent-[var(--pine)]" />
                      <span className="min-w-0">
                        <span className="block font-bold">
                          {s.label}
                          {i === 0 && <span className="ml-2 text-[13px] font-normal text-pine">best fit</span>}
                        </span>
                        <span className="block text-[14px] text-ink-2">{s.plain}</span>
                        <span className="mt-1 block text-[13px] text-ink-3">{s.reasons.slice(0, 3).join(" · ")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6 flex flex-wrap items-end gap-4">
                <label className="grid gap-1">
                  <span className="text-[14px] font-bold">Your ZIP code</span>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    pattern="\d{5}"
                    placeholder="94110"
                    className="w-32 rounded-lg border border-rule bg-paper px-3 py-2 tabular-nums focus:border-pine focus:outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[14px] font-bold">Within</span>
                  <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="rounded-lg border border-rule bg-paper px-3 py-2 focus:border-pine focus:outline-none">
                    {[5, 10, 25, 50].map((r) => (
                      <option key={r} value={r}>
                        {r} miles
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={busy !== null || zip.length !== 5} className="rounded-lg bg-pine px-5 py-2.5 font-bold text-pine-ink disabled:cursor-not-allowed disabled:opacity-40">
                  {busy === "match" ? "Searching the registry…" : "Find doctors"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Step 3 */}
        {results && analysis && (
          <section ref={resultsRef} aria-labelledby="s3" className="mt-16 scroll-mt-24 border-t border-rule pt-10">
            <h2 id="s3" className="text-[28px] font-semibold">
              {results.doctors.length ? `${results.specialty.label} near ${results.origin.city}, ${results.origin.state}` : "No matches in range"}
            </h2>
            <p className="mt-2 max-w-[70ch] text-[15px] text-ink-2">
              {results.withinRadius} of {results.searched} registered {results.specialty.label.toLowerCase()} doctors in the area are within {results.radiusMiles} miles.
              We scored the closest ones on outcomes, quality, experience, distance and fit. Hatched bars mean no public data.
            </p>
            {!results.doctors.length && (
              <p className="mt-4 text-[15px]">Try a larger radius, or a primary care doctor who can refer you.</p>
            )}
            {results.doctors.length > 0 && (
              <ResultsList doctors={results.doctors} zip={zip} conditions={analysis.conditions.map((c) => c.name)} onChoose={setChosen} />
            )}
            <p className="mt-8 text-[13px] text-ink-3">Data: {results.sources.join(" · ")}. Retrieved live in {(results.tookMs / 1000).toFixed(1)}s.</p>
          </section>
        )}

        <p className="mt-16 max-w-[70ch] text-[13px] text-ink-3">
          This tool suggests which specialist to see and who is nearby. It is not a diagnosis and doesn&apos;t replace a clinician&apos;s judgement. In an emergency call 911.
        </p>
      </div>
    </main>
    </>
  );
}

type SortKey = "best" | "nearest" | "quality" | "outcomes";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "nearest", label: "Nearest" },
  { id: "outcomes", label: "Best outcomes" },
  { id: "quality", label: "Highest quality score" },
];
const comp = (d: MatchedDoctor, k: string) => d.score.components.find((c) => c.key === k)?.value ?? -1;

function ResultsList({ doctors, zip, conditions, onChoose }: { doctors: MatchedDoctor[]; zip: string; conditions: string[]; onChoose: (d: MatchedDoctor) => void }) {
  const [sort, setSort] = useState<SortKey>("best");
  const [f, setF] = useState({ verified: false, video: false, hospital4: false, quality: false });
  const [shown, setShown] = useState(15);

  const rankOf = new Map(doctors.map((d, i) => [d.npi, i + 1]));
  const list = doctors
    .filter((d) => (!f.verified || d.platform?.verified) && (!f.video || d.platform?.telehealth) && (!f.hospital4 || (d.hospital?.rating ?? 0) >= 4) && (!f.quality || d.mipsScore !== undefined))
    .sort((a, b) =>
      sort === "nearest" ? a.distanceMiles - b.distanceMiles || b.score.total - a.score.total
      : sort === "quality" ? (b.mipsScore ?? -1) - (a.mipsScore ?? -1)
      : sort === "outcomes" ? comp(b, "outcomes") - comp(a, "outcomes")
      : b.score.total - a.score.total,
    );
  const counts = {
    verified: doctors.filter((d) => d.platform?.verified).length,
    video: doctors.filter((d) => d.platform?.telehealth).length,
    hospital4: doctors.filter((d) => (d.hospital?.rating ?? 0) >= 4).length,
    quality: doctors.filter((d) => d.mipsScore !== undefined).length,
  };
  const FILTERS: { id: keyof typeof f; label: string }[] = [
    { id: "hospital4", label: "Hospital rated 4★ or higher" },
    { id: "quality", label: "Has a Medicare quality score" },
    { id: "verified", label: "Verified on Referral Desk" },
    { id: "video", label: "Offers video visits" },
  ];

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filter doctors</legend>
          {FILTERS.map((x) => (
            <label
              key={x.id}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] transition-colors ${
                f[x.id] ? "border-pine bg-pine font-bold text-pine-ink" : "border-rule bg-surface text-ink-2 hover:border-ink-3"
              } ${counts[x.id] === 0 ? "pointer-events-none opacity-40" : ""}`}
            >
              <input type="checkbox" className="sr-only" checked={f[x.id]} disabled={counts[x.id] === 0} onChange={(e) => { setF({ ...f, [x.id]: e.target.checked }); setShown(15); }} />
              {f[x.id] && <span aria-hidden="true">✓</span>}
              {x.label} <span className={`tabular-nums ${f[x.id] ? "text-pine-ink/80" : "text-ink-3"}`}>{counts[x.id]}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-[14px]">
          <span className="text-ink-2">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-rule bg-surface px-2 py-1.5 focus:border-pine focus:outline-none">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-[14px] text-ink-2" aria-live="polite">
        {list.length === doctors.length ? `${doctors.length} doctors` : `${list.length} of ${doctors.length} doctors match these filters`}
        {sort !== "best" ? ". Numbers show each doctor's overall match rank." : "."}
      </p>

      {list.length > 0 && (
        <p className="mt-4 hidden grid-cols-[2.5rem_1fr_12rem_4.5rem] gap-x-4 px-5 text-[12px] text-ink-3 sm:grid" aria-hidden="true">
          <span />
          <span />
          <span className="grid grid-cols-5 gap-1.5">
            {["Out.", "Qual.", "Exp.", "Dist.", "Fit"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </span>
          <span className="text-right">Score</span>
        </p>
      )}
      <ol className="mt-2 grid gap-3">
        {list.slice(0, shown).map((d) => (
          <DoctorRow key={d.npi} d={d} rank={rankOf.get(d.npi)!} zip={zip} conditions={conditions} onChoose={onChoose} />
        ))}
      </ol>
      {list.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-rule p-6 text-ink-2">
          No doctors match all of these filters. Turn one off, or widen the search radius.
        </p>
      )}
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 15)} className="mt-5 rounded-lg border border-ink px-4 py-2 font-bold">
          Show {Math.min(15, list.length - shown)} more
        </button>
      )}
    </>
  );
}

function Stars({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span aria-label={`${n} out of 5 stars`} className="tracking-tight text-pine">
      {"★".repeat(n)}
      <span className="text-rule">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function DoctorRow({ d, rank, zip, conditions, onChoose }: { d: MatchedDoctor; rank: number; zip: string; conditions: string[]; onChoose: (d: MatchedDoctor) => void }) {
  const [open, setOpen] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [referError, setReferError] = useState<string | null>(null);
  const cap = d.platform?.capacity;
  const unavailable = d.platform?.verified && cap && !cap.accepting;

  async function refer() {
    setSending(true);
    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ npi: d.npi, doctorName: d.name, specialty: d.specialty, conditions: conditions.slice(0, 20), patientZip: zip }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setReferral(data.id);
      onChoose(d);
    }
    else setReferError(data.error || "Couldn't save the referral.");
  }

  const phone = d.address.phone?.replace(/[^\d]/g, "");
  return (
    <li className={`rounded-xl border bg-surface transition-colors ${open ? "border-ink-3" : "border-rule"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid w-full grid-cols-[2rem_1fr_auto] items-start gap-x-4 px-4 py-4 text-left sm:grid-cols-[2.5rem_1fr_12rem_4.5rem] sm:px-5">
        <span className="pt-0.5 font-display text-[18px] font-semibold text-ink-3 tabular-nums">{rank}</span>
        <span className="min-w-0">
          <span className="block font-display text-[19px] font-semibold leading-tight">
            {d.name}
            {d.credential && <span className="font-sans text-[14px] font-normal text-ink-2">, {d.credential}</span>}
          </span>
          <span className="mt-0.5 block text-[14px] text-ink-2">
            {d.taxonomy.replace(/^Internal Medicine, /, "")} · {d.distanceMiles < 1 ? "in your ZIP area" : `${d.distanceMiles} mi`} · {d.address.city}
          </span>
          {d.hospital && (
            <span className="mt-0.5 block truncate text-[14px] text-ink-2">
              {titleCase(d.hospital.name)} <Stars n={d.hospital.rating} />
            </span>
          )}
          {d.platform?.verified && (
            <span className="mt-1.5 inline-flex flex-wrap gap-1.5 text-[12.5px]">
              <span className="rounded-full bg-pine px-2 py-0.5 font-bold text-pine-ink">Verified on Referral Desk</span>
              {d.platform.acceptingNew && cap && (
                <span className="rounded-full border border-pine px-2 py-0.5 text-pine">
                  Accepting new patients{cap.total - cap.used <= 3 ? ` · ${cap.total - cap.used} spot${cap.total - cap.used === 1 ? "" : "s"} left this week` : ""}
                </span>
              )}
              {unavailable && (
                <span className="rounded-full border border-warn/60 bg-warn-wash px-2 py-0.5 text-warn">
                  {cap!.full ? "Full this week" : "Not taking new patients"}
                </span>
              )}
              {d.platform.telehealth && <span className="rounded-full border border-rule px-2 py-0.5 text-ink-2">Video visits</span>}
            </span>
          )}
        </span>
        <span className="col-span-3 mt-3 sm:col-span-1 sm:mt-1.5">
          <ScoreStrip components={d.score.components} />
        </span>
        <span className="row-start-1 text-right sm:row-auto col-start-3 sm:col-start-auto">
          <span className="block font-display text-[30px] font-semibold leading-none tabular-nums text-pine">{Math.round(d.score.total)}</span>
          <span className="text-[12px] text-ink-3">of 100</span>
        </span>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-rule px-4 py-5 sm:grid-cols-[1fr_16rem] sm:px-5 sm:pl-[4.75rem]">
          <div>
            <h4 className="text-[15px] font-bold">Why this rank</h4>
            <div className="mt-3">
              <ScoreStrip components={d.score.components} detailed />
            </div>
            {d.procedures.length > 0 && (
              <p className="mt-4 text-[14px] text-ink-2">
                Medicare procedure volume: {d.procedures.map((p) => `${p.category.toLowerCase()} — ${p.percentile}th percentile`).join("; ")}.
              </p>
            )}
            {d.platform?.bio && <p className="mt-4 max-w-[60ch] text-[15px]">{d.platform.bio}</p>}
          </div>
          <div className="grid content-start gap-3 text-[14px]">
            <address className="not-italic text-ink-2">
              {d.address.line1}
              {d.address.line2 ? `, ${d.address.line2}` : ""}
              <br />
              {d.address.city}, {d.address.state} {d.address.zip}
            </address>
            {phone && (
              <a href={`tel:${phone}`} className="font-bold text-pine underline underline-offset-2">
                {d.address.phone}
              </a>
            )}
            <a href={`https://npiregistry.cms.hhs.gov/provider-view/${d.npi}`} target="_blank" rel="noreferrer" className="text-ink-2 underline underline-offset-2">
              NPI {d.npi} in the federal registry
            </a>
            {referral ? (
              <div className="rounded-lg bg-pine-wash p-3 text-ink">
                <p className="font-bold">Referral saved</p>
                <p className="mt-1">
                  After your visit, tell us how it went — it improves rankings for the next patient.{" "}
                  <Link href={`/referral/${referral}`} className="font-bold text-pine underline underline-offset-2">
                    Open your follow-up page
                  </Link>
                </p>
                <button type="button" onClick={() => window.print()} className="mt-2 font-bold text-pine underline underline-offset-2">
                  Print a summary to bring to {d.name}
                </button>
              </div>
            ) : unavailable ? (
              <p className="rounded-lg bg-warn-wash p-3 text-ink">
                {cap!.full
                  ? `This doctor's new-patient spots are full${cap!.nextOpening ? ` until ${new Date(cap!.nextOpening).toLocaleDateString()}` : ""}. You can still call the office.`
                  : "This doctor has paused new patients."}
              </p>
            ) : (
              <>
                <button type="button" onClick={refer} disabled={sending} className="rounded-lg bg-ink px-4 py-2.5 font-bold text-paper disabled:opacity-50">
                  {sending ? "Saving…" : "Save this referral"}
                </button>
                {referError && <p role="alert" className="text-alert">{referError}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

const ACRONYMS = new Set(["NYU", "UCSF", "UCLA", "USC", "UC", "UCSD", "UNC", "UPMC", "MD", "NY", "VA", "UT", "OHSU", "LAC", "HCA", "CHI", "SSM", "UAB", "UVA", "MUSC", "OSF", "II", "III"]);
function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b([a-z][a-z']*)\b/g, (w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .replace(/\bCtr\b/g, "Center")
    .replace(/\bHosp\b/g, "Hospital");
}

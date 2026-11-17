import type { Analysis } from "@/lib/analysis/engine";
import type { MatchedDoctor } from "@/lib/matching/match";

// A one-page summary the patient can print or save as PDF and hand to the
// doctor. Rendered only for print; built entirely in the browser from the
// analysis already on screen, so nothing extra is stored or sent.

function questionsFor(a: Analysis): string[] {
  const q: string[] = [];
  // "Blood pressure" → "blood pressure", but keep "HbA1c", "LDL", "eGFR".
  const inSentence = (n: string) => (/^[A-Z][a-z]/.test(n) ? n[0].toLowerCase() + n.slice(1) : n);
  for (const l of a.labs.slice(0, 3)) q.push(`My ${inSentence(l.name)} was ${l.value} ${l.unit} (${l.label.toLowerCase()}). What does that mean for me, and what should the target be?`);
  for (const c of a.conditions.filter((c) => c.context === "current").slice(0, 2)) q.push(`What's the plan for my ${c.name.toLowerCase()}, and how will we know it's working?`);
  if (a.conditions.some((c) => c.context === "family")) q.push("Given my family history, should I be screened for anything?");
  q.push("Are there tests I should have before the next visit?", "What symptoms should make me call sooner or go to the ER?");
  return q.slice(0, 6);
}

export function VisitSummary({ analysis, notes, doctor }: { analysis: Analysis & { documents?: { name: string }[] }; notes: string; doctor?: MatchedDoctor | null }) {
  const top = analysis.specialties[0];
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return (
    <article className="hidden text-[11pt] leading-snug text-black print:block" aria-hidden="true">
      <header className="flex items-baseline justify-between border-b-2 border-black pb-2">
        <h1 className="text-[20pt] font-semibold">Visit summary</h1>
        <span>{today}</span>
      </header>
      <p className="mt-2 text-[9.5pt]">
        Prepared by the patient with Referral Desk from {analysis.documents?.length ? analysis.documents.map((d) => d.name).join(", ") : "their notes"}. Automated extraction — please verify against the source records.
      </p>

      <section className="mt-4">
        <h2 className="text-[13pt] font-semibold">Reason for referral</h2>
        <p className="mt-1">
          <b>{top?.label}</b> — {top?.reasons.slice(0, 4).join("; ")}.
        </p>
        {doctor && (
          <p className="mt-1">
            Seeing: {doctor.name}
            {doctor.credential ? `, ${doctor.credential}` : ""} (NPI {doctor.npi}), {doctor.address.line1}, {doctor.address.city}, {doctor.address.state}.
          </p>
        )}
        {analysis.redFlags.length > 0 && <p className="mt-1 font-bold">Flagged in records: {analysis.redFlags.join(", ")}.</p>}
      </section>

      {analysis.conditions.length > 0 && (
        <section className="mt-4">
          <h2 className="text-[13pt] font-semibold">Conditions found in records</h2>
          <table className="mt-1 w-full border-collapse text-[10pt]">
            <tbody>
              {analysis.conditions.map((c) => (
                <tr key={c.id} className="border-b border-neutral-300">
                  <td className="py-1 pr-3">{c.name}</td>
                  <td className="py-1 pr-3">ICD-10 {c.icd10}</td>
                  <td className="py-1">{c.context === "current" ? "current" : c.context === "family" ? "family history" : "past history"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {analysis.labs.length > 0 && (
        <section className="mt-4">
          <h2 className="text-[13pt] font-semibold">Results outside the normal range</h2>
          <table className="mt-1 w-full border-collapse text-[10pt]">
            <tbody>
              {analysis.labs.map((l) => (
                <tr key={l.id} className="border-b border-neutral-300">
                  <td className="py-1 pr-3">{l.name}</td>
                  <td className="py-1 pr-3">
                    {l.value} {l.unit}
                  </td>
                  <td className="py-1">{l.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {analysis.procedures.length > 0 && (
        <section className="mt-4">
          <h2 className="text-[13pt] font-semibold">Procedures and tests mentioned</h2>
          <p className="mt-1">{analysis.procedures.map((p) => p.name).join(", ")}.</p>
        </section>
      )}

      {notes.trim() && (
        <section className="mt-4">
          <h2 className="text-[13pt] font-semibold">In my words</h2>
          <p className="mt-1 whitespace-pre-wrap">{notes.trim()}</p>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-[13pt] font-semibold">Questions I&apos;d like to ask</h2>
        <ol className="mt-1 list-decimal pl-5">
          {questionsFor(analysis).map((q) => (
            <li key={q} className="py-0.5">{q}</li>
          ))}
        </ol>
      </section>

      <footer className="mt-6 border-t border-neutral-400 pt-2 text-[8.5pt]">
        Not a diagnosis. Generated automatically from documents the patient uploaded; codes from NLM ICD-10-CM. In an emergency, call 911.
      </footer>
    </article>
  );
}

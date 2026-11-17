import Link from "next/link";

const RANKING = [
  { label: "Outcomes", weight: 35, body: "CMS star rating and mortality measures for the hospitals the doctor practices at, blended with how patients we referred say they're doing.", source: "CMS Hospital Compare · patient follow-ups" },
  { label: "Quality score", weight: 25, body: "The doctor's Merit-based Incentive Payment System score — Medicare's own measure of care quality and cost.", source: "CMS Quality Payment Program, PY2024" },
  { label: "Experience", weight: 15, body: "How many of the relevant procedures they perform compared with doctors nationally.", source: "CMS Doctors & Clinicians utilization" },
  { label: "Distance", weight: 15, body: "Closer is better, within the radius you choose.", source: "ZIP code centroids" },
  { label: "Specialty fit", weight: 10, body: "Whether this is their primary specialty, and if they've verified with us and are taking new patients.", source: "NPPES taxonomy · onboarding" },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_27rem] lg:gap-16 lg:pt-20">
        <div className="self-center">
          <h1 className="max-w-[14ch] text-[clamp(2.4rem,6vw,4.25rem)] font-semibold">Your records already say which specialist you need</h1>
          <p className="mt-6 max-w-[54ch] text-[19px] text-ink-2">
            Upload a lab report, visit note or scan. We read it, pick out what matters, and rank the doctors near you using
            Medicare&apos;s public quality and outcome data — with every reason shown.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/find" className="rounded-lg bg-pine px-6 py-3.5 text-[17px] font-bold text-pine-ink">
              Upload your records
            </Link>
            <Link href="/doctors/join" className="rounded-lg border border-ink px-6 py-3.5 text-[17px] font-bold hover:bg-ink hover:text-paper">
              I&apos;m a doctor
            </Link>
          </div>
          <p className="mt-5 text-[14px] text-ink-3">Free. Files are read in memory and never stored.</p>
        </div>

        {/* The memorable bit: a real-looking record with the highlighter at work. */}
        <figure className="relative self-center" aria-label="Example: how a lab report is read">
          <div className="rotate-[0.6deg] rounded-md border border-rule bg-surface p-6 shadow-[0_1px_0_var(--rule),0_18px_40px_-24px_rgba(20,40,34,0.35)]">
            <div className="flex justify-between border-b border-rule pb-3 text-[12px] text-ink-3">
              <span>Comprehensive metabolic panel</span>
              <span className="tabular-nums">09/30/2026</span>
            </div>
            <div className="sweep mt-4 grid gap-2.5 text-[15px] leading-relaxed text-ink-2">
              <p>
                <mark className="finding" style={{ ["--i" as string]: 0 }}>Hemoglobin A1c 9.4 %</mark> <span className="text-ink-3">(ref 4.0–5.6)</span>
              </p>
              <p>
                <mark className="finding" style={{ ["--i" as string]: 1 }}>Fasting glucose 212 mg/dL</mark>
              </p>
              <p>LDL cholesterol 98 mg/dL</p>
              <p>
                <mark className="finding" style={{ ["--i" as string]: 2 }}>eGFR 54</mark> mL/min/1.73m²
              </p>
              <p className="pt-2 text-[14px]">
                Comment: <mark className="finding" style={{ ["--i" as string]: 3 }}>type 2 diabetes</mark>, poorly controlled. No retinopathy.
              </p>
            </div>
          </div>
          <figcaption className="mt-5 grid gap-1.5 pl-1 text-[14px]">
            <span className="flex items-baseline gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-marker" aria-hidden="true" />
              <span><b>Endocrinology</b> <span className="text-ink-2">— best fit, from A1c, glucose and the diagnosis</span></span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-ink-3" aria-hidden="true" />
              <span><b>Nephrology</b> <span className="text-ink-2">— second, from reduced kidney function</span></span>
            </span>
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-[22ch] text-[clamp(1.75rem,3.4vw,2.5rem)] font-semibold">How a doctor earns a place on your list</h2>
          <p className="mt-3 max-w-[64ch] text-ink-2">
            There&apos;s no public &ldquo;success rate&rdquo; for individual US doctors, so we don&apos;t pretend to have one. Instead every ranking is built from
            named federal datasets, and gets sharper as patients report back how their visit went.
          </p>
          <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {RANKING.map((r) => (
              <div key={r.label}>
                <dt className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
                  <span className="font-display text-[20px] font-semibold">{r.label}</span>
                  <span className="font-display text-[20px] font-semibold tabular-nums text-pine">{r.weight}%</span>
                </dt>
                <dd className="mt-3 text-[15px] text-ink-2">
                  {r.body}
                  <span className="mt-1.5 block text-[13px] text-ink-3">{r.source}</span>
                </dd>
              </div>
            ))}
            <div className="rounded-lg bg-pine-wash p-5 text-[15px]">
              <p className="font-bold">Missing data counts against a doctor</p>
              <p className="mt-1 text-ink-2">A doctor with one great number and nothing else won&apos;t outrank one with a full, solid record.</p>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] font-semibold">Doctors with room for new patients</h2>
          <p className="mt-3 max-w-[52ch] text-ink-2">
            Apply with your NPI. We check it against the federal registry — name, license, specialty, active status — in seconds. Pass, and
            patients whose records match your specialty start seeing you, up to the weekly number you set.
          </p>
          <Link href="/doctors/join" className="mt-6 inline-block font-bold text-pine underline underline-offset-4">
            Apply to receive referrals
          </Link>
        </div>
        <div>
          <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] font-semibold">Already a patient of the clinic?</h2>
          <p className="mt-3 max-w-[52ch] text-ink-2">
            The after-hours voice assistant can pull up your chart and answer questions about medications and symptoms at night.
          </p>
          <Link href="/patient" className="mt-6 inline-block font-bold text-pine underline underline-offset-4">
            Talk to the after-hours assistant
          </Link>
        </div>
      </section>

      <footer className="border-t border-rule">
        <p className="mx-auto max-w-6xl px-4 py-8 text-[13px] text-ink-3 sm:px-6">
          Referral Desk suggests which kind of specialist to see and who is nearby. It is not a diagnosis or medical advice. In an emergency,
          call 911. Doctor data: CMS NPPES, CMS Provider Data Catalog. Diagnosis codes: NLM ICD-10-CM.
        </p>
      </footer>
    </main>
  );
}

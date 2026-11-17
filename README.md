# Doctor Agent

Two products in one app:

1. **Referral Desk** (`/find`, `/doctors/join`, `/admin`) — patients upload their records; the app works out which
   specialist they need and ranks nearby doctors on public CMS quality and outcome data. Doctors apply with their NPI
   and are verified against the federal registry automatically.
2. **After-hours triage** (`/patient`, `/doctor`) — the original voice assistant, described further down.

## Referral Desk

### How it works

| Step | What happens | Real-world data source |
|---|---|---|
| Upload | PDF / DOCX / TXT parsed in memory. Photos and scanned PDFs are OCR'd locally with Tesseract (no key, nothing leaves the server; Groq vision is used instead if `GROQ_API_KEY` is set). Nothing is stored. | — |
| Analyse | Section-aware clinical rules: ~100 conditions, 16 procedure/test families (weighted below diagnoses), 11 lab analytes with thresholds, negation ("denies chest pain"), family vs. past history, red flags. Diagnosis lines outside the lexicon are looked up live. | NLM ICD-10-CM (every code validated live) |
| Match | Doctors with the right NUCC taxonomy in the patient's ZIP area, filtered by distance. | CMS NPPES NPI Registry, Zippopotam.us |
| Rank | Outcomes 35% · Quality 25% · Experience 15% · Distance 15% · Fit 10%. Missing data lowers the score. | CMS Hospital General Info (star rating, mortality), PY2024 MIPS, Doctors & Clinicians utilization + facility affiliation |
| Success rate | Patients report how they're doing after the visit (`/referral/[id]`); this blends into the outcomes score with a Beta(2,2) prior so it only moves as evidence accumulates. | Platform data |
| Doctor capacity | Each verified doctor sets new patients per week; referrals are counted over a rolling 7 days and refused (409) when full or paused. Patients see "Full this week" / spots left. | Platform data |
| Doctor portal | `/doctors/manage#<token>` — private link shown once at sign-up (only a SHA-256 hash is stored; admins can reissue). Doctors pause intake, change capacity, see referrals and outcomes. | Platform data |
| Results | Filter by hospital rating, Medicare quality score, verified, video visits; sort by best match, nearest, outcomes or quality. | — |
| Visit summary | One-click printable page for the patient to bring: reason for referral, conditions with ICD-10, abnormal labs, procedures, their own notes, suggested questions. Built in the browser; nothing extra stored. | — |
| Doctor onboarding | NPI check digit, registry match on name / status / taxonomy / license / location, CMS footprint → `verified`, `needs_review`, or `rejected`. Reviewers can't approve a failed identity check. | CMS NPPES, CMS provider data |

There is no public per-doctor "success rate" in the US, so the app doesn't invent one — every number in the
ranking comes from a named dataset and the UI shows which.

### Validation on real data

`npm run validate:analyzer -- /path/to/mtsamples.csv` scores the analyzer on
[MTSamples](https://raw.githubusercontent.com/socd06/medical-nlp/master/data/mtsamples.csv) — ~5,000 real de-identified
transcribed reports labelled by specialty. The lexicon was tuned on even rows only; odd rows are the held-out set.

| Held-out (1,025 reports, 17 specialties) | Top-1 | Top-3 |
|---|---:|---:|
| Initial rules | 39.3% | 45.7% |
| + negation, sections, broader lexicon | 56.5% | 67.2% |
| + procedure/test signals | 64.0% | 75.7% |
| + foot/ankle, tendon, stroke, spinal cord, gait | **65.6%** | **78.1%** (85.3% when any finding exists) |

Weakest: nephrology (54.8% top-3) — MTSamples files much urologic surgery (stones, bladder tumours) under
"Nephrology"; the mapping is left strict rather than tuned to the dataset.

Full per-specialty tables: `validation/analyzer-report-holdout.md`.

### Tests

CI (`.github/workflows/ci.yml`) runs typecheck, unit tests and build on every push and PR, and the live
government-data suite nightly so an upstream API change shows up as a failing check.

```bash
npm test            # unit tests (analyzer, PDF extraction, NPI/name/license matching, scoring)
npm run test:live   # hits NPPES, CMS and NLM: ICD codes exist, real doctors verify, impostors are rejected,
                    # matching returns enriched results in SF / NYC / Chicago / Houston
```

Live testing found and fixed: a corrupt image upload crashing the Node process via an uncaught
tesseract.js worker error; a retired ICD-10 code (G35 → G35.D), an NPI with a foreign practice address
passing the location check, and verified doctors being dropped past the enrichment cap.

### Running it

> **iCloud / Dropbox warning.** This folder sits on an iCloud-synced Desktop. With "Optimize Mac Storage" on, macOS
> offloads files it thinks are unused — it offloaded 12,000+ files in `node_modules` overnight, which made `tsc`,
> `next dev` and git hang on reads. Caches now live in the system temp dir, but keep the project itself outside
> Desktop/Documents (e.g. `~/code/doctor-agent`), or rerun `rm -rf node_modules .next && npm ci` if it happens again.


No keys needed for Referral Desk — `npm install && npm run dev`, then open `/find`. Applications and referrals go to
`data/store.json` unless Supabase is configured (tables in `supabase/schema.sql`). Set `ADMIN_TOKEN` before deploying.

---

## After-hours triage

After-hours triage assistant. Patients verify their identity, talk to an AI by voice
in the browser, and the assistant pulls their chart, classifies urgency
(emergency / urgent / routine / info), escalates emergencies, and logs everything
to a doctor-facing dashboard.

**Demo / portfolio project. Not for real clinical use.** No BAA, no FDA clearance.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- Groq — Llama 3.3 70B for chat, Whisper-large-v3 for STT (one API key)
- Browser `speechSynthesis` for TTS (zero setup; swap to ElevenLabs later)
- Supabase (Postgres) for patients, records, calls, transcripts
- Vercel for hosting

## Setup

### 1. Install
```bash
npm install
```

### 2. Supabase
Create a project at https://supabase.com. In the SQL editor, run:
1. `supabase/schema.sql`
2. `supabase/seed.sql` (optional — three demo patients)

### 3. Env
Copy `.env.local.example` to `.env.local` and fill in:
- `GROQ_API_KEY` from https://console.groq.com
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Project Settings → API

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000.

## Demo flow

1. Click **"I'm a patient"**.
2. Enter one of the seeded names + DOB:
   - Koushik Sharma · 1995-03-12 (diabetic, asks about alcohol)
   - Anita Reddy · 1962-08-04 (cardiac history — try saying "I have chest pressure")
   - Marcus Chen · 1978-11-22 (post-op, wound care questions)
3. Hold the mic button, speak, release. Assistant transcribes → triages → answers.
4. Visit `/doctor` to see the call log, transcripts, and any escalations.

## Architecture notes

- **No vector DB yet.** Each patient has a few records — we stuff them all into the
  prompt (Llama 3.3 70B has 128K context). When records grow, add pgvector and switch
  `lib/patient-context.ts` to retrieval.
- **Triage runs as a separate fast LLM call** before the main response. Keeps the
  classifier focused and lets us hard-code the emergency response without trusting
  the chat model to escalate.
- **Browser TTS** is robotic. Swap `speak()` in `app/patient/page.tsx` for ElevenLabs
  when you want production-grade voice.

## Deploy to Vercel

1. Push to GitHub.
2. Import repo at https://vercel.com/new.
3. Paste the same env vars from `.env.local`.
4. Deploy.

## Disclaimer

This software does not replace medical advice. It is not a medical device. It must
not be used to make clinical decisions for real patients without appropriate
regulatory clearance, BAAs with all infrastructure providers, and physician
oversight.

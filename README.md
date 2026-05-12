# Doctor Agent

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

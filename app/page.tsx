import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-semibold mb-3">Doctor Agent</h1>
        <p className="text-zinc-400">
          After-hours triage assistant. Patients can speak with an AI that pulls their
          chart, classifies urgency, and escalates emergencies. Demo only — not for real clinical use.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/patient"
          className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-medium hover:bg-emerald-400 transition"
        >
          I'm a patient
        </Link>
        <Link
          href="/doctor"
          className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-100 font-medium hover:bg-zinc-700 transition"
        >
          Doctor dashboard
        </Link>
      </div>
    </main>
  );
}

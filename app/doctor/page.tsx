import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DoctorHome() {
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, date_of_birth, phone")
    .order("full_name");

  const { data: calls } = await supabaseAdmin
    .from("calls")
    .select("id, started_at, urgency, escalated, patient_id, patients(full_name)")
    .order("started_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-8">Doctor dashboard</h1>

      <section className="mb-10">
        <h2 className="text-xl mb-3">Recent calls</h2>
        <div className="bg-zinc-900 rounded-2xl divide-y divide-zinc-800">
          {(calls ?? []).length === 0 && (
            <div className="p-4 text-sm text-zinc-500">No calls yet.</div>
          )}
          {(calls ?? []).map((c: any) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.patients?.full_name ?? "Unknown"}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(c.started_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.escalated && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                    ESCALATED
                  </span>
                )}
                {c.urgency && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      c.urgency === "emergency"
                        ? "bg-red-500 text-white"
                        : c.urgency === "urgent"
                        ? "bg-orange-500 text-black"
                        : "bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    {c.urgency}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-3">Patients</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(patients ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/doctor/patient/${p.id}`}
              className="block p-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl transition"
            >
              <div className="font-medium">{p.full_name}</div>
              <div className="text-xs text-zinc-500">DOB {p.date_of_birth} · {p.phone}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

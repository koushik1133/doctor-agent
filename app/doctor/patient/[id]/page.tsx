import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import AddRecord from "./AddRecord";

export const dynamic = "force-dynamic";

export default async function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, date_of_birth, phone")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: records } = await supabaseAdmin
    .from("records")
    .select("id, kind, title, body, created_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const { data: calls } = await supabaseAdmin
    .from("calls")
    .select("id, started_at, urgency, escalated")
    .eq("patient_id", id)
    .order("started_at", { ascending: false });

  const callIds = (calls ?? []).map((c) => c.id);
  const { data: messages } =
    callIds.length > 0
      ? await supabaseAdmin
          .from("messages")
          .select("call_id, role, content, created_at")
          .in("call_id", callIds)
          .order("created_at")
      : { data: [] as any[] };

  const msgsByCall = new Map<string, any[]>();
  for (const m of messages ?? []) {
    const arr = msgsByCall.get(m.call_id) ?? [];
    arr.push(m);
    msgsByCall.set(m.call_id, arr);
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">{patient.full_name}</h1>
        <div className="text-sm text-zinc-500">DOB {patient.date_of_birth} · {patient.phone}</div>
      </header>

      <section>
        <h2 className="text-xl mb-3">Records</h2>
        <div className="space-y-3">
          {(records ?? []).map((r) => (
            <div key={r.id} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="uppercase">{r.kind}</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div className="font-medium mb-1">{r.title}</div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
        <AddRecord patientId={patient.id} />
      </section>

      <section>
        <h2 className="text-xl mb-3">Call history</h2>
        <div className="space-y-3">
          {(calls ?? []).length === 0 && (
            <div className="text-sm text-zinc-500">No calls yet.</div>
          )}
          {(calls ?? []).map((c) => (
            <details key={c.id} className="bg-zinc-900 rounded-2xl p-4">
              <summary className="cursor-pointer flex justify-between items-center">
                <span>{new Date(c.started_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  {c.escalated && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                      ESCALATED
                    </span>
                  )}
                  {c.urgency && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700">
                      {c.urgency}
                    </span>
                  )}
                </div>
              </summary>
              <div className="mt-3 space-y-2">
                {(msgsByCall.get(c.id) ?? []).map((m, i) => (
                  <div
                    key={i}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      m.role === "assistant"
                        ? "bg-zinc-800"
                        : "bg-emerald-500/20 border border-emerald-500/40"
                    }`}
                  >
                    <span className="text-xs text-zinc-500 mr-2">{m.role}</span>
                    {m.content}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

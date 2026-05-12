import { NextRequest, NextResponse } from "next/server";
import { groq, CHAT_MODEL } from "@/lib/groq";
import { buildPatientBlock } from "@/lib/patient-context";
import { SYSTEM_PROMPT, TRIAGE_PROMPT, type Urgency } from "@/lib/prompts";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

type Msg = { role: "user" | "assistant"; content: string };

const ALLOWED: Urgency[] = ["emergency", "urgent", "routine", "info"];

async function classify(history: Msg[], latest: string): Promise<Urgency> {
  const recent = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await groq.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    max_tokens: 4,
    messages: [
      { role: "system", content: TRIAGE_PROMPT },
      { role: "user", content: `Conversation so far:\n${recent}\n\nLatest patient message:\n${latest}` },
    ],
  });
  const word = (res.choices[0]?.message?.content || "").trim().toLowerCase();
  return (ALLOWED.find((u) => word.startsWith(u)) || "routine") as Urgency;
}

export async function POST(req: NextRequest) {
  const { callId, patientId, history, message } = (await req.json()) as {
    callId: string;
    patientId: string;
    history: Msg[];
    message: string;
  };

  if (!callId || !patientId || !message) {
    return NextResponse.json({ error: "callId, patientId, message required" }, { status: 400 });
  }

  const [patientBlock, urgency] = await Promise.all([
    buildPatientBlock(patientId),
    classify(history, message),
  ]);

  // Save the user turn
  await supabaseAdmin.from("messages").insert({ call_id: callId, role: "user", content: message });

  let assistantText: string;

  if (urgency === "emergency") {
    assistantText =
      "This sounds like it could be an emergency. Please hang up and call 911 right now, or have someone nearby call for you. I'm flagging your doctor immediately. Stay where you are and try to stay calm. If you're alone, unlock your front door if you safely can.";
    await supabaseAdmin
      .from("calls")
      .update({ urgency: "emergency", escalated: true })
      .eq("id", callId);
  } else {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT(patientBlock) },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const res = await groq.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      max_tokens: 250,
      messages,
    });
    assistantText = res.choices[0]?.message?.content?.trim() || "I'm sorry, I didn't catch that — could you repeat?";
    await supabaseAdmin.from("calls").update({ urgency }).eq("id", callId);
  }

  await supabaseAdmin
    .from("messages")
    .insert({ call_id: callId, role: "assistant", content: assistantText });

  return NextResponse.json({ reply: assistantText, urgency });
}

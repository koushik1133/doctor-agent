import { NextRequest, NextResponse } from "next/server";
import { groq, STT_MODEL } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no audio" }, { status: 400 });
  }

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: STT_MODEL,
    response_format: "json",
  });

  return NextResponse.json({ text: transcription.text });
}

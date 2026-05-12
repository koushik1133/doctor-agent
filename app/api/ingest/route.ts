import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { patientId, kind, title, body } = await req.json();
  if (!patientId || !kind || !title || !body) {
    return NextResponse.json({ error: "patientId, kind, title, body required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("records")
    .insert({ patient_id: patientId, kind, title, body })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

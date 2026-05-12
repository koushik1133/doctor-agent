import { NextRequest, NextResponse } from "next/server";
import { findPatient } from "@/lib/patient-context";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { fullName, dob } = await req.json();
  if (!fullName || !dob) {
    return NextResponse.json({ error: "fullName and dob required" }, { status: 400 });
  }

  const patient = await findPatient(fullName, dob);
  if (!patient) {
    return NextResponse.json({ matched: false });
  }

  const { data: call } = await supabaseAdmin
    .from("calls")
    .insert({ patient_id: patient.id })
    .select("id")
    .single();

  return NextResponse.json({
    matched: true,
    patient: { id: patient.id, full_name: patient.full_name },
    callId: call?.id,
  });
}

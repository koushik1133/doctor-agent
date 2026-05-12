import { supabaseAdmin } from "./supabase";

export type PatientRecord = {
  id: string;
  full_name: string;
  date_of_birth: string;
  phone: string | null;
};

export async function findPatient(fullName: string, dob: string): Promise<PatientRecord | null> {
  const { data } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, date_of_birth, phone")
    .ilike("full_name", fullName.trim())
    .eq("date_of_birth", dob)
    .maybeSingle();
  return data ?? null;
}

// For demo scale (a few records per patient) we just stuff every record into the
// prompt. Llama 3.3 70B has 128K context — plenty. Swap to pgvector RAG later.
export async function buildPatientBlock(patientId: string): Promise<string> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("full_name, date_of_birth")
    .eq("id", patientId)
    .single();

  const { data: records } = await supabaseAdmin
    .from("records")
    .select("kind, title, body, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (!patient) return "(no patient record found)";

  const header = `Name: ${patient.full_name}\nDOB: ${patient.date_of_birth}\n`;
  const body = (records ?? [])
    .map((r) => `--- ${r.kind.toUpperCase()} | ${r.title} ---\n${r.body}`)
    .join("\n\n");

  return header + "\n" + (body || "(no records on file)");
}

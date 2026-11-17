import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SPECIALTIES, type SpecialtyId } from "@/lib/specialties";
import { store, newId, capacityFor } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  npi: z.string().regex(/^\d{10}$/),
  doctorName: z.string().max(120),
  specialty: z.string().refine((s) => s in SPECIALTIES),
  conditions: z.array(z.string().max(120)).max(20),
  patientZip: z.string().regex(/^\d{5}$/),
});

// Saves a referral so the patient can report how it went later. Stores only
// condition names and ZIP — no document text, no patient identity.
export async function POST(req: NextRequest) {
  if (!rateLimit(req, "referral", 20)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid referral." }, { status: 400 });
  // Doctors who joined the platform control their own intake.
  const app = await store().getApplicationByNpi(parsed.data.npi);
  if (app?.status === "verified") {
    const cap = capacityFor(app, await store().listReferrals([app.npi]));
    if (!cap.accepting) {
      return NextResponse.json(
        { error: app.acceptingNew ? "This doctor has reached their new-patient limit for this week. Choose another doctor or try again later." : "This doctor isn't taking new patients right now.", capacity: cap },
        { status: 409 },
      );
    }
  }
  const r = { id: newId(), ...parsed.data, specialty: parsed.data.specialty as SpecialtyId, createdAt: new Date().toISOString() };
  await store().saveReferral(r);
  return NextResponse.json({ id: r.id });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SPECIALTIES, type SpecialtyId } from "@/lib/specialties";
import { store, newId, capacityFor, type Referral } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  npi: z.string().regex(/^\d{10}$/),
  doctorName: z.string().max(120),
  specialty: z.string().refine((s) => s in SPECIALTIES),
  conditions: z.array(z.string().max(120)).max(20),
  patientZip: z.string().regex(/^\d{5}$/),
  request: z
    .object({
      consent: z.literal(true, { message: "Tick the box to agree to share your contact details with this office." }),
      name: z.string().trim().min(2, "Enter your name.").max(80),
      phone: z.string().trim().max(30).regex(/^[\d\s()+.-]*$/, "Enter a valid phone number.").optional().or(z.literal("")),
      email: z.string().trim().email("Enter a valid email address.").max(120).optional().or(z.literal("")),
      preferredTimes: z.string().trim().max(200).optional(),
      note: z.string().trim().max(500).optional(),
    })
    .refine((r) => (r.phone && r.phone.replace(/\D/g, "").length >= 7) || r.email, { message: "Add a phone number or email so the office can reach you." })
    .optional(),
});

// Saves a referral so the patient can report how it went later. By default it
// stores only condition names and ZIP — no document text, no identity. With
// `request`, the patient also asks a verified doctor's office to contact them
// and consents to sharing the contact details they typed.
export async function POST(req: NextRequest) {
  if (!rateLimit(req, "referral", 20)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { request, ...base } = parsed.data;
  // Doctors who joined the platform control their own intake.
  const app = await store().getApplicationByNpi(base.npi);
  if (request && app?.status !== "verified") {
    return NextResponse.json({ error: "This doctor hasn't joined Referral Desk, so requests can't be sent. Call the office instead." }, { status: 422 });
  }
  if (app?.status === "verified") {
    const cap = capacityFor(app, await store().listReferrals([app.npi]));
    if (!cap.accepting) {
      return NextResponse.json(
        { error: app.acceptingNew ? "This doctor has reached their new-patient limit for this week. Choose another doctor or try again later." : "This doctor isn't taking new patients right now.", capacity: cap },
        { status: 409 },
      );
    }
  }
  const now = new Date().toISOString();
  const r: Referral = {
    id: newId(),
    ...base,
    specialty: base.specialty as SpecialtyId,
    createdAt: now,
    request: request
      ? {
          status: "pending",
          consentAt: now,
          contact: {
            name: request.name,
            phone: request.phone || undefined,
            email: request.email || undefined,
            preferredTimes: request.preferredTimes || undefined,
            note: request.note || undefined,
          },
        }
      : undefined,
  };
  await store().saveReferral(r);
  return NextResponse.json({ id: r.id });
}

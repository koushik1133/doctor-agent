import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SPECIALTIES, type SpecialtyId } from "@/lib/specialties";
import { verifyApplication } from "@/lib/verification/verify";
import { store, newId, type DoctorApplication } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";
import { UpstreamError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits."),
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  specialty: z.string().refine((s) => s in SPECIALTIES, "Choose a specialty."),
  licenseState: z.string().trim().length(2, "Use the 2-letter state code.").transform((s) => s.toUpperCase()),
  licenseNumber: z.string().trim().min(3, "License number is required.").max(30),
  practiceZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit practice ZIP."),
  acceptingNew: z.boolean(),
  weeklyCapacity: z.number().int().min(0).max(200),
  telehealth: z.boolean(),
  languages: z.array(z.string().trim().max(30)).max(10).default([]),
  bio: z.string().trim().max(800).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(req, "apply", 5)) return NextResponse.json({ error: "Too many applications from this network. Try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] }, { status: 400 });
  const b = parsed.data;

  const existing = await store().getApplicationByNpi(b.npi);
  if (existing && existing.status !== "rejected") {
    return NextResponse.json({ error: "An application for this NPI already exists.", status: existing.status }, { status: 409 });
  }

  let verification;
  try {
    verification = await verifyApplication({ ...b, specialty: b.specialty as SpecialtyId });
  } catch (e) {
    if (e instanceof UpstreamError) return NextResponse.json({ error: "The NPI Registry is unreachable right now. Try again in a few minutes." }, { status: 503 });
    throw e;
  }

  const app: DoctorApplication = {
    id: existing?.id ?? newId(),
    ...b,
    specialty: b.specialty as SpecialtyId,
    status: verification.decision,
    verification,
    createdAt: new Date().toISOString(),
  };
  await store().saveApplication(app);
  // No portal access yet: the link is issued only after identity is confirmed.
  return NextResponse.json({ id: app.id, status: app.status, verification });
}

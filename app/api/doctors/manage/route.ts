import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store, findApplicationByToken, publicApplication, capacityFor, platformSuccess } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Doctor self-service, authenticated by the private manage link issued at
// application time (sent in the x-manage-token header, never in a URL query).

async function auth(req: NextRequest) {
  return findApplicationByToken(req.headers.get("x-manage-token") ?? "");
}

export async function GET(req: NextRequest) {
  if (!rateLimit(req, "manage", 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const app = await auth(req);
  if (!app) return NextResponse.json({ error: "This manage link isn't valid. Ask an admin to send a new one." }, { status: 401 });
  const referrals = (await store().listReferrals([app.npi])).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({
    application: publicApplication(app),
    capacity: capacityFor(app, referrals),
    success: platformSuccess(referrals),
    referrals: referrals.slice(0, 100).map((r) => ({ id: r.id, createdAt: r.createdAt, conditions: r.conditions, patientZip: r.patientZip, outcome: r.outcome ? { result: r.outcome.result, rating: r.outcome.rating, at: r.outcome.at } : null })),
  });
}

const Patch = z
  .object({
    acceptingNew: z.boolean(),
    weeklyCapacity: z.number().int().min(0).max(200),
    telehealth: z.boolean(),
    languages: z.array(z.string().trim().min(1).max(30)).max(10),
    bio: z.string().trim().max(800),
    phone: z.string().trim().max(30),
  })
  .partial();

export async function PATCH(req: NextRequest) {
  if (!rateLimit(req, "manage", 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const app = await auth(req);
  if (!app) return NextResponse.json({ error: "This manage link isn't valid." }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  // Only availability/profile fields are editable here. Identity fields (NPI,
  // name, license, specialty) require a new, re-verified application.
  const next = { ...app, ...parsed.data, bio: parsed.data.bio === "" ? undefined : parsed.data.bio ?? app.bio, updatedAt: new Date().toISOString() };
  await store().saveApplication(next);
  const referrals = await store().listReferrals([app.npi]);
  return NextResponse.json({ application: publicApplication(next), capacity: capacityFor(next, referrals) });
}

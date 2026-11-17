import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { matchDoctors, MatchError } from "@/lib/matching/match";
import { SPECIALTIES, type SpecialtyId } from "@/lib/specialties";
import { rateLimit } from "@/lib/ratelimit";
import { UpstreamError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  zip: z.string().regex(/^\d{5}(-?\d{4})?$/, "Enter a 5-digit US ZIP code."),
  specialty: z.string().refine((s) => s in SPECIALTIES, "Unknown specialty."),
  radiusMiles: z.number().min(2).max(100).optional(),
  limit: z.number().int().min(1).max(60).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(req, "match", 30)) return NextResponse.json({ error: "Too many searches. Try again in a minute." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const res = await matchDoctors({ ...parsed.data, specialty: parsed.data.specialty as SpecialtyId });
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof MatchError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof UpstreamError) {
      return NextResponse.json({ error: `A public data source is unavailable right now (${e.source}). Try again shortly.` }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Search failed unexpectedly." }, { status: 500 });
  }
}

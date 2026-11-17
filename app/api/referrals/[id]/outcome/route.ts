import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  result: z.enum(["better", "same", "worse"]),
  rating: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

// Patient-reported outcome. Feeds the doctor's platform success rate.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose how you're doing and a rating." }, { status: 400 });
  const r = await store().getReferral(id);
  if (!r) return NextResponse.json({ error: "Referral not found." }, { status: 404 });
  if (r.outcome) return NextResponse.json({ error: "An outcome was already recorded for this referral." }, { status: 409 });
  r.outcome = { ...parsed.data, at: new Date().toISOString() };
  await store().saveReferral(r);
  return NextResponse.json({ ok: true });
}

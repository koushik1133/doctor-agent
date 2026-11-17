import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await store().getReferral(id);
  if (!r) return NextResponse.json({ error: "Referral not found." }, { status: 404 });
  return NextResponse.json(r);
}

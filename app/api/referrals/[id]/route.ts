import { NextRequest, NextResponse } from "next/server";
import { store, withRetention, requestStatus } from "@/lib/store";

export const runtime = "nodejs";

// The referral id is an unguessable UUID that only the patient holds.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await store().getReferral(id);
  if (!found) return NextResponse.json({ error: "Referral not found." }, { status: 404 });
  const [r] = await withRetention([found]);
  const app = await store().getApplicationByNpi(r.npi);
  return NextResponse.json({
    ...r,
    office: app?.status === "verified" ? { phone: app.phone, telehealth: app.telehealth } : null,
  });
}

// Patient cancels a pending request. Contact details are erased immediately.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await store().getReferral(id);
  if (!r?.request) return NextResponse.json({ error: "No request to cancel." }, { status: 404 });
  if (requestStatus(r.request) !== "pending") return NextResponse.json({ error: "Only a pending request can be cancelled." }, { status: 409 });
  r.request = { ...r.request, status: "cancelled", respondedAt: new Date().toISOString(), contact: null, contactErasedAt: new Date().toISOString() };
  await store().saveReferral(r);
  return NextResponse.json({ ok: true });
}

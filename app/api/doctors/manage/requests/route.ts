import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store, findApplicationByToken, requestStatus } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  referralId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
  message: z.string().trim().max(500).optional(),
});

// A doctor's office answers an appointment request.
export async function POST(req: NextRequest) {
  if (!rateLimit(req, "manage", 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const app = await findApplicationByToken(req.headers.get("x-manage-token") ?? "");
  if (!app) return NextResponse.json({ error: "This manage link isn't valid." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const r = await store().getReferral(parsed.data.referralId);
  // Same response for "doesn't exist" and "not yours" so ids can't be probed.
  if (!r || r.npi !== app.npi || !r.request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const status = requestStatus(r.request);
  if (status !== "pending") return NextResponse.json({ error: `This request is already ${status}.` }, { status: 409 });

  r.request = {
    ...r.request,
    status: parsed.data.action === "accept" ? "accepted" : "declined",
    respondedAt: new Date().toISOString(),
    doctorMessage: parsed.data.message || undefined,
  };
  await store().saveReferral(r);
  return NextResponse.json({ ok: true, status: r.request.status });
}

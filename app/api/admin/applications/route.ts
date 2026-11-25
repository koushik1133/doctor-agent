import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { store, publicApplication, newManageToken, isActiveDoctor } from "@/lib/store";
import { verifyApplication } from "@/lib/verification/verify";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin token required." }, { status: 401 });
  return NextResponse.json({ applications: (await store().listApplications()).map(publicApplication) });
}

const Patch = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "reverify", "reissue_link"]),
  note: z.string().max(500).optional(),
  // How identity was confirmed, e.g. "Called the office number on NPPES, spoke to Dr X".
  identityMethod: z.string().trim().min(10, "Describe how you confirmed this person is the doctor.").max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin token required." }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { id, action, note, identityMethod } = parsed.data;
  const app = (await store().listApplications()).find((a) => a.id === id);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  let manageToken: string | undefined;
  if (action === "reissue_link") {
    if (!isActiveDoctor(app)) return NextResponse.json({ error: "Only approved doctors have a practice link." }, { status: 422 });
    // For a doctor who lost their manage link. The old link stops working.
    const t = newManageToken();
    app.manageTokenHash = t.hash;
    manageToken = t.token;
  } else if (action === "reverify") {
    app.verification = await verifyApplication(app);
    // Re-running checks can reject, but never approves and never restores access.
    if (app.verification.decision === "rejected" || !isActiveDoctor(app)) app.status = app.verification.decision;
  } else {
    // A reviewer can't approve someone who failed a critical identity check.
    if (action === "approve" && app.verification.checks.some((c) => c.critical && c.status === "fail")) {
      return NextResponse.json({ error: "This application failed a critical NPI check and can't be approved." }, { status: 422 });
    }
    if (action === "approve") {
      if (!identityMethod) return NextResponse.json({ error: "Describe how you confirmed this person is the doctor." }, { status: 422 });
      app.identityConfirmed = { at: new Date().toISOString(), method: identityMethod };
      const t = newManageToken();
      app.manageTokenHash = t.hash;
      manageToken = t.token;
      app.status = "verified";
    } else {
      app.status = "rejected";
    }
  }
  if (app.status === "rejected") {
    app.manageTokenHash = undefined; // revoke portal access
    app.identityConfirmed = undefined;
  }
  app.reviewedAt = new Date().toISOString();
  if (note) app.reviewNote = note;
  await store().saveApplication(app);
  return NextResponse.json({ application: publicApplication(app), manageToken });
}

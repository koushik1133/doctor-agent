import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analysis/engine";
import { extractDocumentText, ExtractError } from "@/lib/analysis/extract";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Uploaded documents are processed in memory and never stored. Only the
// derived findings are returned to the browser.
export async function POST(req: NextRequest) {
  if (!rateLimit(req, "analyze", 20)) {
    return NextResponse.json({ error: "Too many uploads in a minute. Wait a moment and try again." }, { status: 429 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send the documents as multipart form data." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const notes = String(form.get("notes") ?? "").slice(0, 5000);
  if (!files.length && notes.trim().length < 10) {
    return NextResponse.json({ error: "Add at least one document, or describe your symptoms in a few sentences." }, { status: 400 });
  }
  if (files.length > 8) return NextResponse.json({ error: "Upload up to 8 documents at a time." }, { status: 400 });

  const docs: { name: string; method: string; chars: number }[] = [];
  const parts: string[] = [];
  for (const f of files) {
    try {
      const { text, method } = await extractDocumentText(f);
      docs.push({ name: f.name, method, chars: text.length });
      parts.push(text);
    } catch (e) {
      const msg = e instanceof ExtractError ? e.message : `${f.name}: couldn't read this file.`;
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }
  if (notes.trim()) parts.push(`Patient notes: ${notes.trim()}`);

  const combined = parts.join("\n\n").slice(0, 60000);
  const result = await analyze(combined);
  return NextResponse.json({ ...result, documents: docs });
}

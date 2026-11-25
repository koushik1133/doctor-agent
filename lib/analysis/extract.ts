import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { ocrBuffer, ocrPdf, imageKind } from "./ocr";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = [".pdf", ".txt", ".md", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

export class ExtractError extends Error {}

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

// Turn an uploaded medical document into plain text. PDFs/DOCX/TXT are parsed
// locally. Photos and scanned PDFs are OCR'd locally with Tesseract, or with a
// Groq vision model only when OCR_ENGINE=groq (the photo is then sent to Groq).
export async function extractDocumentText(file: File): Promise<{ text: string; method: string }> {
  if (file.size > MAX_FILE_BYTES) throw new ExtractError(`${file.name} is larger than 10 MB.`);
  const e = ext(file.name);
  const buf = new Uint8Array(await file.arrayBuffer());

  if (e === ".pdf" || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(buf.slice());
    const { text } = await extractText(pdf, { mergePages: true });
    const t = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (t.length >= 20) return { text: t, method: "pdf" };
    // No text layer: a scan. OCR the pages locally.
    const o = await ocrPdf(buf);
    if (o.text.trim().length < 20) throw new ExtractError(`${file.name}: couldn't read any text from this scan. Try a sharper scan or a text-based PDF.`);
    return { text: o.text, method: `pdf-ocr (${o.pages} page${o.pages > 1 ? "s" : ""}, ${Math.round(o.confidence)}% confidence)` };
  }
  if (e === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return { text: value, method: "docx" };
  }
  if (e === ".txt" || e === ".md" || file.type.startsWith("text/")) {
    return { text: new TextDecoder().decode(buf), method: "text" };
  }
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(e) || file.type.startsWith("image/")) {
    return { text: await ocrImage(buf, file.type || "image/png", file.name), method: process.env.GROQ_API_KEY && process.env.OCR_ENGINE === "groq" ? "vision-ocr" : "ocr" };
  }
  throw new ExtractError(`${file.name}: unsupported file type. Use PDF, DOCX, TXT, or an image.`);
}

async function ocrImage(buf: Uint8Array, mime: string, name: string): Promise<string> {
  if (!imageKind(buf) || buf.length < 1024) {
    throw new ExtractError(`${name}: this isn't a readable image. Upload a PNG, JPEG or WebP photo of the page.`);
  }
  const key = process.env.GROQ_API_KEY;
  if (!key || process.env.OCR_ENGINE !== "groq") {
    // Local Tesseract: no key, nothing leaves the server.
    try {
      const { text } = await ocrBuffer(buf);
      if (text.trim().length < 20) throw new Error("empty");
      return text;
    } catch {
      throw new ExtractError(`${name}: couldn't read text from this photo. Retake it flat, in good light, with the whole page in frame.`);
    }
  }
  const b64 = Buffer.from(buf).toString("base64");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe all text in this medical document exactly as written. Output only the transcription." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new ExtractError(`${name}: OCR failed (HTTP ${res.status}).`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

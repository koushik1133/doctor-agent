import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractDocumentText, ExtractError } from "@/lib/analysis/extract";
import { runRules } from "@/lib/analysis/engine";

const file = (path: string, type: string) => new File([readFileSync(path)], path.split("/").pop()!, { type });

describe("document extraction", () => {
  it("extracts text from a PDF and analyses it the same as plain text", async () => {
    const { text, method } = await extractDocumentText(file("tests/fixtures/cardiology-note.pdf", "application/pdf"));
    expect(method).toBe("pdf");
    expect(text).toMatch(/ASSESSMENT/);
    expect(runRules(text).specialties[0].id).toBe("cardiology");
  });
  it("rejects unsupported types with a clear message", async () => {
    await expect(extractDocumentText(new File(["x"], "virus.exe"))).rejects.toThrow(ExtractError);
  });
  it("rejects corrupt images up front instead of crashing the OCR worker", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(extractDocumentText(new File([new Uint8Array([137, 80, 78, 71])], "scan.png", { type: "image/png" }))).rejects.toThrow(/isn't a readable image/);
  });

  it("OCRs a phone photo of a visit note locally, without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    const { text, method } = await extractDocumentText(file("tests/fixtures/cardiology-note-photo.jpg", "image/jpeg"));
    expect(method).toBe("ocr");
    expect(runRules(text).specialties[0].id).toBe("cardiology");
  });

  it("OCRs a scanned PDF with no text layer", async () => {
    const { text, method } = await extractDocumentText(file("tests/fixtures/cardiology-note-scan.pdf", "application/pdf"));
    expect(method).toMatch(/^pdf-ocr/);
    expect(runRules(text).conditions.map((c) => c.id)).toEqual(expect.arrayContaining(["cad", "angina"]));
  });
});

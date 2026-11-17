import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runRules, sectionMap } from "@/lib/analysis/engine";

const fx = (n: string) => readFileSync(`tests/fixtures/${n}`, "utf8");

describe("document analyzer (rules)", () => {
  it("reads a lab report: flags abnormal values, routes to endocrinology", () => {
    const a = runRules(fx("diabetes-labs.txt"));
    const labs = Object.fromEntries(a.labs.map((l) => [l.id, l]));
    expect(labs.a1c.value).toBe(9.4); // not the 4.0 from the reference range
    expect(labs.a1c.severity).toBe("abnormal");
    expect(labs.glucose.value).toBe(212);
    expect(labs.egfr.value).toBe(54);
    expect(labs.tsh).toBeUndefined(); // 2.1 is normal
    expect(labs.alt).toBeUndefined(); // 38 is normal
    expect(a.specialties[0].id).toBe("endocrinology");
    expect(a.specialties.map((s) => s.id)).toContain("nephrology");
    expect(a.conditions.find((c) => c.id === "angina")).toBeUndefined(); // "denies chest pain"
    expect(a.conditions.find((c) => c.id === "retinopathy")).toBeUndefined(); // "No retinopathy"
    expect(a.urgency).toBe("routine");
  });

  it("reads a visit note: assessment beats past history, family history is discounted", () => {
    const a = runRules(fx("cardiology-note.txt"));
    expect(a.specialties[0].id).toBe("cardiology");
    const breast = a.conditions.find((c) => c.id === "breast_ca");
    expect(breast?.context).toBe("family");
    expect(a.specialties.find((s) => s.id === "oncology")?.score ?? 0).toBeLessThan(0.3);
    expect(a.conditions.find((c) => c.id === "allergy_gen")).toBeUndefined(); // the ALLERGIES: header
    const bp = a.labs.find((l) => l.id === "bp");
    expect(bp?.value).toBe(152);
  });

  it("reads an imaging report and routes to orthopedics", () => {
    const a = runRules(fx("ortho-mri.txt"));
    expect(a.specialties[0].id).toBe("orthopedics");
    expect(a.conditions.find((c) => c.id === "fracture")).toBeUndefined(); // "No fracture"
  });

  it("escalates red flags to emergency", () => {
    const a = runRules("Patient reports crushing chest pain radiating to the left arm and facial droop since this morning.");
    expect(a.urgency).toBe("emergency");
    expect(a.redFlags).toEqual(expect.arrayContaining(["Possible heart attack", "Possible stroke"]));
  });

  it("marks critical labs as needing prompt care", () => {
    const a = runRules("Troponin I 2.3 ng/mL. Hemoglobin 6.4 g/dL.");
    expect(a.urgency).toBe("soon");
    expect(a.labs.find((l) => l.id === "hgb")?.severity).toBe("critical");
  });

  it("does not mistake surgical vocabulary for diagnoses", () => {
    const a = runRules("PROCEDURE: Laparoscopic cholecystectomy. Bipolar cautery was used for hemostasis. POSTOPERATIVE DIAGNOSIS: Same.");
    expect(a.conditions.find((c) => c.id === "bipolar")).toBeUndefined();
  });

  it("uses procedures as supporting evidence without calling them diagnoses", () => {
    const a = runRules("PROCEDURE PERFORMED: Cystourethroscopy and TURBT of a 2 cm lateral wall lesion. Postop instructions given.");
    expect(a.specialties[0].id).toBe("urology");
    expect(a.procedures.map((p) => p.id)).toContain("cysto");
    expect(a.conditions.find((c) => c.id === "cysto")).toBeUndefined();
  });

  it("ignores procedures that were not done", () => {
    const a = runRules("No prior colonoscopy. Patient declines echocardiogram today.");
    expect(a.procedures.find((p) => p.id === "endo_gi")).toBeUndefined();
  });

  it("falls back to primary care when nothing specialist-level is found", () => {
    const a = runRules("Routine annual physical. Feeling well. Exercises 3 times a week.");
    expect(a.specialties[0].id).toBe("primary_care");
  });

  it("returns non-overlapping highlight spans inside the text", () => {
    const a = runRules(fx("cardiology-note.txt"));
    for (let i = 1; i < a.spans.length; i++) expect(a.spans[i].start).toBeGreaterThanOrEqual(a.spans[i - 1].end);
    for (const s of a.spans) expect(s.end).toBeLessThanOrEqual(a.text.length);
  });

  it("detects note sections", () => {
    const kinds = sectionMap(fx("cardiology-note.txt")).map((s) => `${s.header}:${s.kind}`);
    expect(kinds).toEqual(expect.arrayContaining(["CHIEF COMPLAINT:focus", "PAST MEDICAL HISTORY:history", "FAMILY HISTORY:family", "ASSESSMENT:focus"]));
  });
});

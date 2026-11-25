/**
 * Live tests against the real public data sources (NPPES, CMS, NLM).
 * Skipped unless LIVE=1:   LIVE=1 npx vitest run tests/live.test.ts
 */
import { describe, expect, it } from "vitest";
import { searchProviders, lookupNpi } from "@/lib/sources/nppes";
import { verifyApplication } from "@/lib/verification/verify";
import { matchDoctors } from "@/lib/matching/match";
import { validateIcd10 } from "@/lib/sources/icd10";
import { CONDITIONS, LABS } from "@/lib/analysis/lexicon";
import { analyze } from "@/lib/analysis/engine";
import { SPECIALTIES } from "@/lib/specialties";
import { mapLimit } from "@/lib/http";

const live = process.env.LIVE === "1" ? describe : describe.skip;

live("real-world data", () => {
  it("every ICD-10 code in the lexicon exists in the current ICD-10-CM release", async () => {
    const codes = [...new Set([...CONDITIONS.map((c) => c.icd10), ...LABS.flatMap((l) => (l.icd10 ? [l.icd10] : []))])];
    const missing: string[] = [];
    await mapLimit(codes, 6, async (c) => {
      if (!(await validateIcd10(c))) missing.push(c);
    });
    expect(missing).toEqual([]);
  });

  it("verifies a real cardiologist pulled from NPPES", async () => {
    const [doc] = (await searchProviders({ taxonomyDescription: "Cardiovascular Disease", state: "NY", city: "NEW YORK", pages: 1 })).filter((p) =>
      p.taxonomies.some((t) => t.code === "207RC0000X" && t.primary && t.license && t.state === "NY"),
    );
    expect(doc).toBeTruthy();
    const lic = doc.taxonomies.find((t) => t.code === "207RC0000X")!;
    const report = await verifyApplication({
      npi: doc.npi, firstName: doc.firstName, lastName: doc.lastName, specialty: "cardiology",
      licenseState: lic.state!, licenseNumber: lic.license!, practiceZip: doc.address.zip,
    });
    expect(report.checks.find((c) => c.id === "name")!.status).toBe("pass");
    expect(report.checks.find((c) => c.id === "license")!.status).toBe("pass");
    expect(report.checks.find((c) => c.id === "specialty")!.status).toBe("pass");
    expect(report.decision).toBe("needs_review"); // public data never proves identity
  });

  it("catches an impostor using a real doctor's NPI", async () => {
    const { provider } = await lookupNpi("1003809641");
    expect(provider).toBeTruthy();
    const report = await verifyApplication({
      npi: "1003809641", firstName: "Jane", lastName: "Impostor", specialty: "cardiology",
      licenseState: "CA", licenseNumber: "A999999", practiceZip: "94110",
    });
    expect(report.decision).toBe("rejected");
    expect(report.checks.find((c) => c.id === "name")!.status).toBe("fail");
  });

  it("rejects a made-up NPI that passes the check digit but isn't registered", async () => {
    const report = await verifyApplication({ npi: "1234567893", firstName: "A", lastName: "B", specialty: "cardiology", licenseState: "CA", licenseNumber: "1234", practiceZip: "94110" });
    expect(report.decision).toBe("rejected");
  });

  it.each([
    ["94110", "cardiology"],
    ["10016", "endocrinology"],
    ["60611", "orthopedics"],
    ["77030", "oncology"],
  ] as const)("finds nearby %s %s specialists with real CMS enrichment", async (zip, specialty) => {
    const r = await matchDoctors({ zip, specialty, radiusMiles: 15 });
    expect(r.doctors.length).toBeGreaterThan(5);
    for (const d of r.doctors) {
      expect(d.distanceMiles).toBeLessThanOrEqual(15);
      expect(d.score.total).toBeGreaterThan(0);
      expect(d.score.total).toBeLessThanOrEqual(100);
    }
    // Ranked best-first
    const totals = r.doctors.map((d) => d.score.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    // Real enrichment actually present for most of the top results
    const enriched = r.doctors.filter((d) => d.mipsScore !== undefined || d.hospital).length;
    expect(enriched / r.doctors.length).toBeGreaterThan(0.5);
    expect(SPECIALTIES[specialty].taxonomyCodes.length).toBeGreaterThan(0);
  });

  it("resolves diagnosis lines outside the lexicon only when external lookup is enabled", async () => {
    const off = await analyze("Assessment: Sarcoidosis of lung. Type 2 diabetes mellitus.");
    expect(off.conditions.some((c) => c.source === "diagnosis-line")).toBe(false);
    process.env.ALLOW_EXTERNAL_DX_LOOKUP = "1";
    const a = await analyze("Assessment: Sarcoidosis of lung. Type 2 diabetes mellitus.");
    const t2 = a.conditions.find((c) => c.id === "t2dm")!;
    expect(t2.icd10Verified).toBe(true);
    expect(a.conditions.some((c) => c.source === "diagnosis-line" && c.icd10.startsWith("D86"))).toBe(true);
  });
});

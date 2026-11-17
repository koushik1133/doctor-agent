import { describe, expect, it } from "vitest";
import { score, type ScoreInput } from "@/lib/matching/score";
import { platformSuccess, type Referral } from "@/lib/store";

const base: ScoreInput = {
  distanceMiles: 5,
  radiusMiles: 25,
  mipsScore: 80,
  procedurePercentile: 60,
  hospital: { rating: 4, better: 1, worse: 0, total: 8 },
  primaryMatch: true,
  verifiedOnPlatform: false,
};

describe("ranking score", () => {
  it("rewards better outcomes, quality, and proximity", () => {
    const s = score(base).total;
    expect(score({ ...base, hospital: { rating: 5, better: 3, worse: 0, total: 8 } }).total).toBeGreaterThan(s);
    expect(score({ ...base, hospital: { rating: 2, better: 0, worse: 3, total: 8 } }).total).toBeLessThan(s);
    expect(score({ ...base, mipsScore: 98 }).total).toBeGreaterThan(s);
    expect(score({ ...base, distanceMiles: 20 }).total).toBeLessThan(s);
  });
  it("penalises missing evidence instead of ignoring it", () => {
    const sparse = score({ distanceMiles: 5, radiusMiles: 25, primaryMatch: true, verifiedOnPlatform: false, mipsScore: 80 });
    expect(sparse.coverage).toBeLessThan(1);
    expect(sparse.total).toBeLessThan(score(base).total + 5);
  });
  it("lets patient-reported outcomes move the outcome score as they accumulate", () => {
    const few = score({ ...base, platform: { rate: 0.95, n: 2 } });
    const many = score({ ...base, platform: { rate: 0.95, n: 60 } });
    const o = (r: typeof few) => r.components.find((c) => c.key === "outcomes")!.value!;
    expect(o(many)).toBeGreaterThan(o(few));
  });
  it("stays within 0–100", () => {
    const best = score({ ...base, distanceMiles: 0, mipsScore: 100, procedurePercentile: 100, hospital: { rating: 5, better: 8, worse: 0, total: 8 }, verifiedOnPlatform: true, acceptingNew: true });
    expect(best.total).toBeLessThanOrEqual(100);
    expect(best.total).toBeGreaterThan(90);
  });
});

describe("platform success rate", () => {
  const ref = (result: "better" | "same" | "worse"): Referral => ({ id: "x", npi: "1", doctorName: "", specialty: "cardiology", conditions: [], patientZip: "94110", createdAt: "", outcome: { result, rating: 5, at: "" } });
  it("shrinks small samples toward 50%", () => {
    expect(platformSuccess([ref("better")])!.rate).toBeCloseTo(0.6);
    expect(platformSuccess([])).toBeNull();
  });
});

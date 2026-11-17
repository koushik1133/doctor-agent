// Transparent, pure scoring. Every component is 0–1 and comes from a named
// public data source, so the UI can show exactly why a doctor ranks where they
// do. There is no public per-doctor "success rate" in the US, so the outcome
// component combines (a) CMS outcome data for the hospitals the doctor
// practices at and (b) outcomes reported by patients we referred.

export type ScoreInput = {
  distanceMiles: number;
  radiusMiles: number;
  mipsScore?: number; // 0–100, CMS MIPS final score
  procedurePercentile?: number; // 0–100, CMS utilization percentile for relevant procedures
  procedureCount?: number;
  yearsRegistered?: number;
  hospital?: { rating?: number; better: number; worse: number; total: number };
  platform?: { rate: number; n: number };
  primaryMatch: boolean;
  verifiedOnPlatform: boolean;
  acceptingNew?: boolean;
};

export type Component = {
  key: "outcomes" | "quality" | "experience" | "proximity" | "fit";
  label: string;
  weight: number;
  value: number | null; // null = no data
  detail: string;
  source: string;
};

export type ScoreResult = { total: number; coverage: number; components: Component[] };

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function hospitalOutcomeScore(h: NonNullable<ScoreInput["hospital"]>): number | null {
  const parts: number[] = [];
  if (h.rating) parts.push((h.rating - 1) / 4);
  if (h.total > 0) parts.push(clamp(0.5 + (h.better - h.worse) / (2 * h.total) + 0.0));
  if (!parts.length) return null;
  return parts.length === 2 ? parts[0] * 0.6 + parts[1] * 0.4 : parts[0];
}

export function score(i: ScoreInput): ScoreResult {
  const hospital = i.hospital ? hospitalOutcomeScore(i.hospital) : null;
  let outcomes: number | null = hospital;
  let outcomeDetail = hospital !== null
    ? `Affiliated hospital: ${i.hospital!.rating ? `${i.hospital!.rating}★ CMS rating` : "unrated"}, ${i.hospital!.better} outcome measures better / ${i.hospital!.worse} worse than national`
    : "No CMS hospital outcome data";
  if (i.platform && i.platform.n > 0) {
    const w = i.platform.n / (i.platform.n + 5); // trust platform data as it accumulates
    outcomes = hospital === null ? i.platform.rate : hospital * (1 - w) + i.platform.rate * w;
    outcomeDetail += `; ${Math.round(i.platform.rate * 100)}% of ${i.platform.n} referred patients reported improvement`;
  }

  const quality = i.mipsScore !== undefined ? clamp(i.mipsScore / 100) : null;

  let experience: number | null = null;
  let expDetail = "No procedure volume or registration data";
  if (i.procedurePercentile !== undefined) {
    experience = clamp(i.procedurePercentile / 100);
    expDetail = `${i.procedurePercentile}th percentile procedure volume nationally${i.procedureCount ? ` (${i.procedureCount} Medicare cases)` : ""}`;
  } else if (i.yearsRegistered !== undefined) {
    experience = clamp(i.yearsRegistered / 20) * 0.8; // weaker signal than real volume
    expDetail = `${Math.round(i.yearsRegistered)} years since NPI registration`;
  }

  const proximity = clamp(1 - i.distanceMiles / Math.max(1, i.radiusMiles));
  const fit = clamp((i.primaryMatch ? 0.6 : 0.3) + (i.verifiedOnPlatform ? 0.3 : 0) + (i.acceptingNew ? 0.1 : 0));

  const components: Component[] = [
    { key: "outcomes", label: "Outcomes", weight: 0.35, value: outcomes, detail: outcomeDetail, source: "CMS Hospital Compare + patient follow-ups" },
    { key: "quality", label: "Quality score", weight: 0.25, value: quality, detail: quality !== null ? `MIPS ${i.mipsScore!.toFixed(1)} / 100` : "Not in CMS MIPS reporting", source: "CMS Quality Payment Program (PY2024)" },
    { key: "experience", label: "Experience", weight: 0.15, value: experience, detail: expDetail, source: "CMS Doctors & Clinicians utilization / NPPES" },
    { key: "proximity", label: "Distance", weight: 0.15, value: proximity, detail: i.distanceMiles < 1 ? "Same ZIP code area" : `${i.distanceMiles.toFixed(1)} mi away`, source: "ZIP centroid distance" },
    { key: "fit", label: "Specialty fit", weight: 0.1, value: fit, detail: [i.primaryMatch ? "Primary specialty matches" : "Secondary specialty matches", i.verifiedOnPlatform ? "verified on platform" : null, i.acceptingNew ? "accepting new patients" : null].filter(Boolean).join(", "), source: "NPPES taxonomy + onboarding" },
  ];

  const present = components.filter((c) => c.value !== null);
  const wSum = present.reduce((s, c) => s + c.weight, 0);
  const raw = present.reduce((s, c) => s + c.weight * (c.value as number), 0) / (wSum || 1);
  // Penalise sparse evidence so a doctor with one great number doesn't outrank
  // one with a full, solid record.
  const coverage = wSum; // weights sum to 1.0
  const total = raw * (0.7 + 0.3 * coverage);
  return { total: Math.round(total * 1000) / 10, coverage, components };
}

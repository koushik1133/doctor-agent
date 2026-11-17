import { fetchJson, mapLimit } from "../http";

// CMS Provider Data Catalog (data.cms.gov/provider-data). Public, no key.
// Datasets used:
//   a174-a962  PY2024 Clinician Public Reporting: Overall MIPS Performance
//   n0yb-util  Doctors & Clinicians Utilization (procedure volume + percentile)
//   27ea-46a8  Doctors & Clinicians Facility Affiliation
//   xubh-q36u  Hospital General Information (overall star rating, outcome groups)

const BASE = "https://data.cms.gov/provider-data/api/1/datastore/query";
export const DATASETS = {
  mips: "a174-a962",
  utilization: "n0yb-util",
  affiliation: "27ea-46a8",
  hospitals: "xubh-q36u",
} as const;

type QueryResponse<T> = { results: T[]; count: number };

function inQuery(property: string, values: string[], limit = 1500): string {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  q.set("conditions[0][property]", property);
  q.set("conditions[0][operator]", "in");
  for (const v of values) q.append("conditions[0][value][]", v);
  return q.toString();
}

async function queryIn<T>(dataset: string, property: string, values: string[]): Promise<T[]> {
  const unique = [...new Set(values)].filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 60) chunks.push(unique.slice(i, i + 60));
  const results = await mapLimit(chunks, 3, async (chunk) => {
    const data = await fetchJson<QueryResponse<T>>(`${BASE}/${dataset}/0?${inQuery(property, chunk)}`, {
      source: `CMS ${dataset}`,
      ttlMs: 7 * 24 * 3600 * 1000,
      timeoutMs: 25000,
    });
    return data.results ?? [];
  });
  return results.flat();
}

const num = (v: string | undefined) => {
  if (v === undefined || v === "") return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

export type MipsScore = { finalScore: number; quality?: number; cost?: number; source: "individual" | "group" | string };

export async function getMipsScores(npis: string[]): Promise<Map<string, MipsScore>> {
  type Row = { npi: string; source: string; final_mips_score: string; quality_category_score: string; cost_category_score: string };
  const rows = await queryIn<Row>(DATASETS.mips, "npi", npis);
  const out = new Map<string, MipsScore>();
  for (const r of rows) {
    const finalScore = num(r.final_mips_score);
    if (finalScore === undefined) continue;
    const prev = out.get(r.npi);
    // Prefer the individual score over group/APM scores when both exist.
    if (prev && prev.source === "individual" && r.source !== "individual") continue;
    out.set(r.npi, { finalScore, quality: num(r.quality_category_score), cost: num(r.cost_category_score), source: r.source });
  }
  return out;
}

export type ProcedureVolume = { category: string; count?: number; percentile?: number };

export async function getUtilization(npis: string[]): Promise<Map<string, ProcedureVolume[]>> {
  type Row = { npi: string; procedure_category: string; count: string; percentile: string; profile_display_indicator: string };
  const rows = await queryIn<Row>(DATASETS.utilization, "npi", npis);
  const out = new Map<string, ProcedureVolume[]>();
  for (const r of rows) {
    const list = out.get(r.npi) ?? [];
    list.push({ category: r.procedure_category, count: num(r.count), percentile: num(r.percentile) });
    out.set(r.npi, list);
  }
  return out;
}

export async function getAffiliations(npis: string[]): Promise<Map<string, string[]>> {
  type Row = { npi: string; facility_type: string; facility_affiliations_certification_number: string };
  const rows = await queryIn<Row>(DATASETS.affiliation, "npi", npis);
  const out = new Map<string, string[]>();
  for (const r of rows) {
    if (!/hospital/i.test(r.facility_type)) continue;
    const ccn = r.facility_affiliations_certification_number;
    if (!ccn) continue;
    const list = out.get(r.npi) ?? [];
    if (!list.includes(ccn)) list.push(ccn);
    out.set(r.npi, list);
  }
  return out;
}

export type Hospital = {
  ccn: string;
  name: string;
  city: string;
  state: string;
  rating?: number; // CMS overall star rating 1–5
  mortality: { better: number; worse: number; total: number };
  safety: { better: number; worse: number; total: number };
  readmission: { better: number; worse: number; total: number };
};

export async function getHospitals(ccns: string[]): Promise<Map<string, Hospital>> {
  type Row = Record<string, string>;
  const rows = await queryIn<Row>(DATASETS.hospitals, "facility_id", ccns);
  const out = new Map<string, Hospital>();
  const g = (r: Row, k: string) => num(r[k]) ?? 0;
  for (const r of rows) {
    out.set(r.facility_id, {
      ccn: r.facility_id,
      name: r.facility_name,
      city: r.citytown,
      state: r.state,
      rating: num(r.hospital_overall_rating),
      mortality: {
        better: g(r, "count_of_mort_measures_better"),
        worse: g(r, "count_of_mort_measures_worse"),
        total: g(r, "count_of_facility_mort_measures"),
      },
      safety: {
        better: g(r, "count_of_safety_measures_better"),
        worse: g(r, "count_of_safety_measures_worse"),
        total: g(r, "count_of_facility_safety_measures"),
      },
      readmission: {
        better: g(r, "count_of_readm_measures_better"),
        worse: g(r, "count_of_readm_measures_worse"),
        total: g(r, "count_of_facility_readm_measures"),
      },
    });
  }
  return out;
}

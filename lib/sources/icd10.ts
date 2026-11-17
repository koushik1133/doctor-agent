import { fetchJson } from "../http";

// NLM Clinical Tables ICD-10-CM API — https://clinicaltables.nlm.nih.gov
// Response shape: [total, codes[], extra, [[code, name], ...]]
type Resp = [number, string[], unknown, [string, string][]];

const BASE = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";

export async function searchIcd10(terms: string, max = 5): Promise<{ code: string; name: string }[]> {
  const url = `${BASE}?sf=code,name&maxList=${max}&terms=${encodeURIComponent(terms)}`;
  const data = await fetchJson<Resp>(url, { source: "NLM ICD-10", ttlMs: 30 * 24 * 3600 * 1000, timeoutMs: 8000 });
  return (data[3] ?? []).map(([code, name]) => ({ code, name }));
}

// Confirms a code exists in the current ICD-10-CM release and returns its
// official description.
export async function validateIcd10(code: string): Promise<{ code: string; name: string } | null> {
  const res = await searchIcd10(code, 10);
  return res.find((r) => r.code.toUpperCase() === code.toUpperCase()) ?? null;
}

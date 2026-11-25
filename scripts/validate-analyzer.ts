/**
 * Validates the document analyzer against MTSamples — ~5,000 real,
 * de-identified transcribed medical reports, each labelled with the specialty
 * that wrote it. We check whether that specialty appears in our top-1 / top-3
 * recommendations.
 *
 *   curl -L -o /tmp/mtsamples.csv https://raw.githubusercontent.com/socd06/medical-nlp/master/data/mtsamples.csv
 *   npx tsx scripts/validate-analyzer.ts /tmp/mtsamples.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { runRules } from "../lib/analysis/engine";
import type { SpecialtyId } from "../lib/specialties";

const LABELS: Record<string, SpecialtyId[]> = {
  "Cardiovascular / Pulmonary": ["cardiology", "pulmonology"],
  Orthopedic: ["orthopedics"],
  Gastroenterology: ["gastroenterology", "general_surgery"],
  Neurology: ["neurology"],
  "Obstetrics / Gynecology": ["obgyn"],
  Urology: ["urology", "nephrology"],
  "ENT - Otolaryngology": ["ent"],
  "Hematology - Oncology": ["oncology", "hematology"],
  Ophthalmology: ["ophthalmology"],
  Nephrology: ["nephrology"],
  "Psychiatry / Psychology": ["psychiatry"],
  Dermatology: ["dermatology"],
  Endocrinology: ["endocrinology"],
  Rheumatology: ["rheumatology"],
  "Allergy / Immunology": ["allergy"],
  "Sleep Medicine": ["pulmonology", "neurology"],
  Neurosurgery: ["neurology", "orthopedics"],
};

function parseCsv(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const file = process.argv[2];
if (!file) { console.error("usage: validate-analyzer.ts <mtsamples.csv>"); process.exit(1); }
const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
const iSpec = header.indexOf("medical_specialty");
const iText = header.indexOf("transcription");

type Stat = { n: number; top1: number; top3: number; none: number };
const per = new Map<string, Stat>();
const total: Stat = { n: 0, top1: 0, top3: 0, none: 0 };
const misses: string[] = [];

// --split=tune evaluates even rows only (used while editing the lexicon);
// --split=holdout (default) evaluates odd rows; --split=dedup drops
// those whose text also appears in an even row. Results on odd rows WERE looked
// at between lexicon changes, so treat all of these as development scores.
const split = (process.argv.find((a) => a.startsWith("--split=")) ?? "--split=holdout").slice(8);
// MTSamples repeats the same text under several specialties; a held-out report
// whose text also sits in the tuning half isn't held out.
const norm = (t = "") => t.toLowerCase().split(/\s+/).join(" ").trim();
const tuneTexts = new Set(rows.filter((_, i) => i % 2 === 0).map((r) => norm(r[iText])));
for (const [idx, r] of rows.entries()) {
  if (split === "dedup" && (idx % 2 === 0 || tuneTexts.has(norm(r[iText])))) continue;
  if (split !== "all" && split !== "dedup" && idx % 2 !== (split === "tune" ? 0 : 1)) continue;
  const label = r[iSpec]?.trim();
  const text = (r[iText] ?? "").replace(/,\s{2}/g, "\n");
  const expected = LABELS[label];
  if (!expected || text.length < 50) continue;
  const res = runRules(text);
  const ranked = res.specialties.map((s) => s.id);
  const noSignal = ranked.length === 1 && ranked[0] === "primary_care" && !res.conditions.length;
  const t1 = expected.includes(ranked[0]);
  const t3 = ranked.slice(0, 3).some((s) => expected.includes(s));
  const s = per.get(label) ?? { n: 0, top1: 0, top3: 0, none: 0 };
  for (const x of [s, total]) { x.n++; if (t1) x.top1++; if (t3) x.top3++; if (noSignal) x.none++; }
  per.set(label, s);
  if (!t3 && !noSignal && misses.length < 25) misses.push(`- **${label}** → got ${ranked.slice(0, 3).join(", ")} (conditions: ${res.conditions.map((c) => c.name).slice(0, 4).join("; ")})`);
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "—");
const lines = [
  `# Analyzer validation — MTSamples`,
  ``,
  `Run: ${new Date().toISOString()} · engine: rules (offline) · split: ${split} · reports evaluated: ${total.n}`,
  ``,
  `| Specialty label | Reports | Top-1 | Top-3 | No finding |`,
  `|---|---:|---:|---:|---:|`,
  ...[...per.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, s]) => `| ${k} | ${s.n} | ${pct(s.top1, s.n)} | ${pct(s.top3, s.n)} | ${pct(s.none, s.n)} |`),
  `| **All** | **${total.n}** | **${pct(total.top1, total.n)}** | **${pct(total.top3, total.n)}** | ${pct(total.none, total.n)} |`,
  ``,
  `Top-3 among reports where the analyzer found anything: **${pct(total.top3, total.n - total.none)}**`,
  ``,
  `## Sample misses`,
  ...misses,
];
mkdirSync("validation", { recursive: true });
writeFileSync(`validation/analyzer-report-${split}.md`, lines.join("\n") + "\n");
console.log(lines.slice(0, 30).join("\n"));

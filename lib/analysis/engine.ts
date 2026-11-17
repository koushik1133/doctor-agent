import { CONDITIONS, LABS, PROCEDURES, RED_FLAGS, NEGATION, FAMILY } from "./lexicon";
import { SPECIALTIES, specialtyForIcd10, type SpecialtyId } from "../specialties";
import { searchIcd10, validateIcd10 } from "../sources/icd10";
import { mapLimit } from "../http";

export type Span = { start: number; end: number; kind: "condition" | "lab" | "flag" | "procedure"; label: string; specialty?: SpecialtyId };

export type ProcedureMention = { id: string; name: string; specialty: SpecialtyId; mentions: number; evidence: string };

export type Finding = {
  id: string;
  mentions?: number;
  focus?: boolean; // appears in chief complaint / assessment / diagnosis / procedure sections
  name: string;
  icd10: string;
  icd10Name?: string; // official NLM description, when validated
  icd10Verified: boolean;
  specialty: SpecialtyId;
  evidence: string;
  context: "current" | "family" | "history";
  source: "lexicon" | "diagnosis-line" | "lab";
};

export type LabFinding = {
  id: string;
  name: string;
  value: number;
  unit: string;
  label: string;
  severity: "abnormal" | "critical";
  specialty: SpecialtyId;
  evidence: string;
};

export type SpecialtyNeed = {
  id: SpecialtyId;
  label: string;
  plain: string;
  score: number; // 0–1 relative strength
  reasons: string[];
};

export type Analysis = {
  text: string;
  wordCount: number;
  conditions: Finding[];
  labs: LabFinding[];
  procedures: ProcedureMention[];
  redFlags: string[];
  urgency: "emergency" | "soon" | "routine";
  specialties: SpecialtyNeed[];
  spans: Span[];
  engine: "rules" | "rules+llm";
};

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Clinical note sections. Findings in the reason-for-visit / assessment
// sections drive the referral; past history and review of systems count less.
type SectionKind = "focus" | "history" | "family" | "meds" | "other";
const SECTION_HEADERS: [RegExp, SectionKind][] = [
  [/^(?:chief complaint|cc|reason for (?:visit|referral|consultation)|history of present illness|hpi|presenting complaint|indications?|assessment(?: and plan)?|impression|diagnos[ie]s|pre-?operative diagnosis|post-?operative diagnosis|final diagnosis|procedures? performed|procedure|operation|findings|plan|problem list|a\/p|summary)$/i, "focus"],
  [/^(?:past medical history|pmh|past surgical history|psh|medical history|past history|previous history)$/i, "history"],
  [/^(?:family history|fhx|fh)$/i, "family"],
  [/^(?:medications?|current medications|allergies|social history|review of systems|ros)$/i, "meds"],
];

export function sectionMap(text: string): { start: number; end: number; kind: SectionKind; header: string }[] {
  const re = /(?:^|\n|[.,]\s{1,3})\s*([A-Za-z][A-Za-z /&-]{1,45}?)\s*:/g;
  const marks: { start: number; kind: SectionKind; header: string; headerEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const h = m[1].trim();
    const hit = SECTION_HEADERS.find(([rx]) => rx.test(h));
    const isUpper = h === h.toUpperCase() && /[A-Z]{3}/.test(h);
    if (!hit && !isUpper) continue;
    marks.push({ start: m.index + m[0].indexOf(m[1]), headerEnd: m.index + m[0].length, kind: hit ? hit[1] : "other", header: h });
  }
  return marks.map((mk, i) => ({ start: mk.start, end: marks[i + 1]?.start ?? text.length, kind: mk.kind, header: mk.header, headerEnd: mk.headerEnd }))
    .map(({ headerEnd: _h, ...rest }) => rest);
}

function headerRanges(text: string): [number, number][] {
  const re = /(?:^|\n|[.,]\s{1,3})\s*([A-Za-z][A-Za-z /&-]{1,45}?)\s*:/g;
  const out: [number, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const h = m[1].trim();
    if (SECTION_HEADERS.some(([rx]) => rx.test(h)) || (h === h.toUpperCase() && /[A-Z]{3}/.test(h))) {
      const st = m.index + m[0].indexOf(m[1]);
      out.push([st, st + m[1].length]);
    }
  }
  return out;
}

function clauseBefore(text: string, idx: number): string {
  const start = Math.max(0, idx - 80);
  const chunk = text.slice(start, idx);
  const cut = Math.max(chunk.lastIndexOf("."), chunk.lastIndexOf("\n"), chunk.lastIndexOf(";"));
  return cut >= 0 ? chunk.slice(cut + 1) : chunk;
}

function sentenceAround(text: string, start: number, end: number): string {
  let s = start;
  while (s > 0 && !/[.\n]/.test(text[s - 1]) && start - s < 160) s--;
  let e = end;
  while (e < text.length && !/[.\n]/.test(text[e]) && e - end < 160) e++;
  return text.slice(s, e + 1).trim();
}

export function runRules(rawText: string): Omit<Analysis, "engine"> {
  const text = normalizeText(rawText);
  const spans: Span[] = [];
  const conditions: Finding[] = [];
  const labs: LabFinding[] = [];
  const redFlags: string[] = [];

  const sections = sectionMap(text);
  const headers = headerRanges(text);
  const sectionAt = (i: number) => sections.find((x) => i >= x.start && i < x.end)?.kind ?? "other";
  const inHeader = (i: number) => headers.some(([a, b]) => i >= a && i < b);

  for (const rule of CONDITIONS) {
    let best: Finding | null = null;
    let mentions = 0;
    let focus = false;
    for (const p of rule.patterns) {
      const re = new RegExp(p.source, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (inHeader(m.index)) continue; // e.g. the "ALLERGIES:" heading itself
        const before = clauseBefore(text, m.index);
        if (NEGATION.test(before)) continue;
        const sec = sectionAt(m.index);
        if (sec === "meds") continue; // drug lists / ROS checklists aren't diagnoses
        const family = sec === "family" || FAMILY.test(before);
        const history = !family && (sec === "history" || /\b(?:history of|h\/o|s\/p|status post|prior)\b[^.;\n]{0,30}$/i.test(before));
        mentions++;
        if (sec === "focus" && !family) focus = true;
        spans.push({ start: m.index, end: m.index + m[0].length, kind: "condition", label: rule.name, specialty: rule.specialty });
        const f: Finding = {
          id: rule.id,
          name: rule.name,
          icd10: rule.icd10,
          icd10Verified: false,
          specialty: rule.specialty,
          evidence: sentenceAround(text, m.index, m.index + m[0].length),
          context: family ? "family" : history ? "history" : "current",
          source: "lexicon",
        };
        // Prefer a "current" mention over family/history mentions.
        if (!best || (best.context !== "current" && f.context === "current")) best = f;
      }
    }
    if (best) {
      if (focus && best.context !== "current") best.context = "current";
      conditions.push({ ...best, mentions, focus });
    }
  }

  for (const rule of LABS) {
    const re = new RegExp(rule.pattern.source, "gi");
    let m: RegExpExecArray | null;
    let worst: LabFinding | null = null;
    while ((m = re.exec(text))) {
      const gap = m[0].slice(0, m[0].length - m[1].length);
      if (/\b(?:ref|range|normal|goal|target|<|>)\b/i.test(gap)) continue; // skip reference ranges
      const value = parseFloat(m[1]);
      const res = rule.evaluate(value);
      const valueStart = m.index + m[0].length - m[1].length;
      if (!res) continue;
      spans.push({ start: m.index, end: valueStart + m[1].length, kind: "lab", label: `${rule.name} ${value} ${rule.unit} — ${res.label}`, specialty: rule.specialty });
      const lf: LabFinding = { id: rule.id, name: rule.name, value, unit: rule.unit, label: res.label, severity: res.severity, specialty: rule.specialty, evidence: sentenceAround(text, m.index, m.index + m[0].length) };
      if (!worst || (res.severity === "critical" && worst.severity !== "critical")) worst = lf;
    }
    if (worst) labs.push(worst);
  }

  const procedures: ProcedureMention[] = [];
  for (const rule of PROCEDURES) {
    const re = new RegExp(rule.pattern.source, "gi");
    let m: RegExpExecArray | null;
    let hit: ProcedureMention | null = null;
    while ((m = re.exec(text))) {
      if (inHeader(m.index)) continue;
      if (NEGATION.test(clauseBefore(text, m.index))) continue;
      if (sectionAt(m.index) === "family") continue;
      spans.push({ start: m.index, end: m.index + m[0].length, kind: "procedure", label: rule.name, specialty: rule.specialty });
      if (!hit) hit = { id: rule.id, name: rule.name, specialty: rule.specialty, mentions: 0, evidence: sentenceAround(text, m.index, m.index + m[0].length) };
      hit.mentions++;
    }
    if (hit) procedures.push(hit);
  }

  for (const flag of RED_FLAGS) {
    const re = new RegExp(flag.pattern.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (NEGATION.test(clauseBefore(text, m.index))) continue;
      spans.push({ start: m.index, end: m.index + m[0].length, kind: "flag", label: flag.message });
      if (!redFlags.includes(flag.message)) redFlags.push(flag.message);
    }
  }

  // A specific diagnosis subsumes its generic sibling.
  const has = (id: string) => conditions.some((c) => c.id === id);
  const drop = new Set<string>();
  if (["breast_ca", "lung_ca", "prostate_ca", "colon_ca", "lymphoma", "leukemia"].some(has)) drop.add("malignancy");
  if (has("t1dm")) drop.add("t2dm");
  if (has("t2dm") || has("t1dm")) drop.add("prediabetes");
  const finalConditions = conditions.filter((c) => !drop.has(c.id));

  const specialties = rankSpecialties(finalConditions, labs, procedures);
  const urgency: Analysis["urgency"] = redFlags.length ? "emergency" : labs.some((l) => l.severity === "critical") ? "soon" : "routine";

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) continue; // drop overlaps, keep first/longest
    merged.push(s);
  }

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    conditions: finalConditions,
    labs,
    procedures,
    redFlags,
    urgency,
    specialties,
    spans: merged,
  };
}

export function rankSpecialties(conditions: Finding[], labs: LabFinding[], procedures: ProcedureMention[] = []): SpecialtyNeed[] {
  const acc = new Map<SpecialtyId, { score: number; reasons: string[] }>();
  const add = (id: SpecialtyId, w: number, reason: string) => {
    const cur = acc.get(id) ?? { score: 0, reasons: [] };
    cur.score += w;
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    acc.set(id, cur);
  };
  const weightOf = (id: string) =>
    ({ family: 0.25, history: 0.6, current: 1 } as const)[conditions.find((c) => c.id === id)?.context ?? "current"];
  for (const c of conditions) {
    const base = c.source === "lexicon" ? lexWeight(c.id) : 0.7;
    const freq = 1 + 0.15 * Math.min((c.mentions ?? 1) - 1, 4);
    const focus = c.focus || c.source === "diagnosis-line" ? 1.6 : 1;
    add(c.specialty, base * weightOf(c.id) * freq * focus, c.context === "family" ? `Family history: ${c.name.toLowerCase()}` : c.name);
  }
  for (const p of procedures) {
    const freq = 1 + 0.15 * Math.min(p.mentions - 1, 4);
    add(p.specialty, PROC_WEIGHT * (PROCEDURES.find((x) => x.id === p.id)?.weight ?? 0.7) * freq, `Mentions ${p.name.toLowerCase()}`);
  }
  // Labs for the same organ are correlated (eGFR and creatinine measure the
  // same thing), so only the strongest counts fully: 1, 0.4, 0.2, …
  const labsBySpec = new Map<SpecialtyId, LabFinding[]>();
  for (const l of labs) labsBySpec.set(l.specialty, [...(labsBySpec.get(l.specialty) ?? []), l]);
  for (const [spec, list] of labsBySpec) {
    list
      .map((l) => ({ l, w: l.severity === "critical" ? 0.9 : 0.5 }))
      .sort((a, b) => b.w - a.w)
      .forEach(({ l, w }, i) => add(spec, w * (i === 0 ? 1 : 0.4 / i), `${l.name} ${l.value} ${l.unit} (${l.label.toLowerCase()})`));
  }

  const list = [...acc.entries()].map(([id, v]) => ({ id, ...v }));
  const max = Math.max(1, ...list.map((x) => x.score));
  const ranked = list
    .map((x) => ({ id: x.id, label: SPECIALTIES[x.id].label, plain: SPECIALTIES[x.id].plain, score: Math.min(1, x.score / max), reasons: x.reasons, raw: x.score }))
    .filter((x) => x.raw >= 0.3)
    .sort((a, b) => b.raw - a.raw)
    .map(({ raw: _raw, ...rest }) => rest);
  if (!ranked.length) {
    return [{ id: "primary_care", label: SPECIALTIES.primary_care.label, plain: SPECIALTIES.primary_care.plain, score: 1, reasons: ["No specialist-level finding — start with a primary care review"] }];
  }
  return ranked;
}

// Procedures are weaker evidence than a diagnosis (a colonoscopy can be
// screening), so they're scaled down.
const PROC_WEIGHT = 0.6;

function lexWeight(id: string): number {
  return CONDITIONS.find((c) => c.id === id)?.weight ?? 0.7;
}

// Lines like "Assessment: ..." / "Diagnosis: ..." / "Impression: ..." often name
// conditions outside our lexicon. Look them up in the NLM ICD-10 table.
function diagnosisLines(text: string): string[] {
  const out: string[] = [];
  const re = /^(?:\s*(?:\d+[.)]\s*)?)(?:assessment|diagnos[ie]s|impression|problem list|dx)\s*[:\-]\s*(.+)$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    for (const part of m[1].split(/[;,]|\.\s+| \d+[.)] /)) {
      const t = part.replace(/\(.*?\)/g, "").replace(/[^a-z0-9 '\-]/gi, " ").trim();
      if (t.length >= 4 && t.split(" ").length <= 7) out.push(t);
    }
  }
  return [...new Set(out)].slice(0, 8);
}

// Full analysis: rules + live ICD-10 validation + NLM lookups for diagnosis
// lines. Network failures degrade gracefully (codes just stay unverified).
export async function analyze(rawText: string): Promise<Analysis> {
  const base = runRules(rawText);
  const known = new Set(base.conditions.map((c) => c.name.toLowerCase()));

  const extra: Finding[] = [];
  const lines = diagnosisLines(base.text);
  await mapLimit(lines, 4, async (line) => {
    const lower = line.toLowerCase();
    if ([...known].some((k) => lower.includes(k) || k.includes(lower))) return;
    if (base.conditions.some((c) => c.evidence.toLowerCase().includes(lower))) return;
    try {
      const [hit] = await searchIcd10(line, 1);
      if (!hit) return;
      extra.push({
        id: `icd-${hit.code}`,
        name: hit.name,
        icd10: hit.code,
        icd10Name: hit.name,
        icd10Verified: true,
        specialty: specialtyForIcd10(hit.code),
        evidence: line,
        context: "current",
        source: "diagnosis-line",
      });
    } catch {
      /* offline: skip */
    }
  });

  await mapLimit(base.conditions, 6, async (c) => {
    try {
      const v = await validateIcd10(c.icd10);
      if (v) {
        c.icd10Verified = true;
        c.icd10Name = v.name;
      }
    } catch {
      /* leave unverified */
    }
  });

  const conditions = [...base.conditions, ...extra.filter((e, i, a) => a.findIndex((x) => x.icd10 === e.icd10) === i)];
  return {
    ...base,
    conditions,
    specialties: rankSpecialties(conditions, base.labs, base.procedures),
    engine: "rules",
  };
}

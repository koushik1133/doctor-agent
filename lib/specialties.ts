// Specialty catalog. Each specialty maps to:
//  - NUCC taxonomy codes (what NPPES stores for every US provider)
//  - NPPES search terms (taxonomy_description is a substring search)
//  - CMS "Utilization" procedure categories that signal hands-on volume
// Source for codes: NUCC Health Care Provider Taxonomy code set.

export type SpecialtyId =
  | "cardiology"
  | "endocrinology"
  | "gastroenterology"
  | "nephrology"
  | "pulmonology"
  | "neurology"
  | "oncology"
  | "hematology"
  | "orthopedics"
  | "dermatology"
  | "rheumatology"
  | "psychiatry"
  | "obgyn"
  | "urology"
  | "ophthalmology"
  | "ent"
  | "infectious_disease"
  | "allergy"
  | "general_surgery"
  | "primary_care";

export type Specialty = {
  id: SpecialtyId;
  label: string;
  plain: string; // what a patient would call it
  taxonomyCodes: string[];
  searchTerms: string[];
  procedures: string[];
};

export const SPECIALTIES: Record<SpecialtyId, Specialty> = {
  cardiology: {
    id: "cardiology",
    label: "Cardiology",
    plain: "Heart specialist",
    taxonomyCodes: ["207RC0000X", "207RI0011X", "207RC0001X", "207RA0001X"],
    searchTerms: ["Cardiovascular Disease", "Interventional Cardiology"],
    procedures: ["Coronary angioplasty and stenting", "Pacemaker insertion or repair", "Coronary artery bypass graft (CABG)"],
  },
  endocrinology: {
    id: "endocrinology",
    label: "Endocrinology",
    plain: "Diabetes, thyroid & hormone specialist",
    taxonomyCodes: ["207RE0101X"],
    searchTerms: ["Endocrinology"],
    procedures: [],
  },
  gastroenterology: {
    id: "gastroenterology",
    label: "Gastroenterology",
    plain: "Digestive & liver specialist",
    taxonomyCodes: ["207RG0100X", "207RI0008X", "207RT0003X"],
    searchTerms: ["Gastroenterology", "Hepatology"],
    procedures: ["Colonoscopy", "Upper gastrointestinal (GI) endoscopy for acid reflux"],
  },
  nephrology: {
    id: "nephrology",
    label: "Nephrology",
    plain: "Kidney specialist",
    taxonomyCodes: ["207RN0300X"],
    searchTerms: ["Nephrology"],
    procedures: [],
  },
  pulmonology: {
    id: "pulmonology",
    label: "Pulmonology",
    plain: "Lung & breathing specialist",
    taxonomyCodes: ["207RP1001X", "207RC0200X"],
    searchTerms: ["Pulmonary Disease"],
    procedures: [],
  },
  neurology: {
    id: "neurology",
    label: "Neurology",
    plain: "Brain & nerve specialist",
    taxonomyCodes: ["2084N0400X", "2084V0102X", "2084N0402X", "2084B0040X"],
    searchTerms: ["Neurology"],
    procedures: ["Laminectomy or laminotomy (partial removal of spine bones)"],
  },
  oncology: {
    id: "oncology",
    label: "Oncology",
    plain: "Cancer specialist",
    taxonomyCodes: ["207RH0003X", "207RX0202X", "2086X0206X"],
    searchTerms: ["Hematology & Oncology", "Medical Oncology"],
    procedures: ["Mastectomy"],
  },
  hematology: {
    id: "hematology",
    label: "Hematology",
    plain: "Blood specialist",
    taxonomyCodes: ["207RH0000X", "207RH0003X"],
    searchTerms: ["Hematology"],
    procedures: [],
  },
  orthopedics: {
    id: "orthopedics",
    label: "Orthopedic surgery",
    plain: "Bone & joint specialist",
    taxonomyCodes: ["207X00000X", "207XS0114X", "207XX0004X", "207XS0117X", "207XS0106X", "207XX0801X", "207XX0005X"],
    searchTerms: ["Orthopaedic Surgery"],
    procedures: [
      "Knee replacement",
      "Hip replacement",
      "Lower limb (leg) arthroscopy (minimally invasive joint repair)",
      "Upper limb (arm) arthroscopy (minimally invasive joint repair)",
      "Spinal fusion",
    ],
  },
  dermatology: {
    id: "dermatology",
    label: "Dermatology",
    plain: "Skin specialist",
    taxonomyCodes: ["207N00000X", "207ND0101X", "207ND0900X", "207NS0135X"],
    searchTerms: ["Dermatology"],
    procedures: ["Skin biopsy", "Removal of skin cancer", "Melanoma (skin cancer) excision", "Removal of skin lesions"],
  },
  rheumatology: {
    id: "rheumatology",
    label: "Rheumatology",
    plain: "Arthritis & autoimmune specialist",
    taxonomyCodes: ["207RR0500X"],
    searchTerms: ["Rheumatology"],
    procedures: [],
  },
  psychiatry: {
    id: "psychiatry",
    label: "Psychiatry",
    plain: "Mental health doctor",
    taxonomyCodes: ["2084P0800X", "2084P0804X", "2084P0805X"],
    searchTerms: ["Psychiatry"],
    procedures: [],
  },
  obgyn: {
    id: "obgyn",
    label: "Obstetrics & gynecology",
    plain: "Women's health specialist",
    taxonomyCodes: ["207V00000X", "207VG0400X", "207VM0101X", "207VE0102X", "207VX0201X"],
    searchTerms: ["Obstetrics & Gynecology"],
    procedures: ["Removal of the uterus"],
  },
  urology: {
    id: "urology",
    label: "Urology",
    plain: "Urinary & prostate specialist",
    taxonomyCodes: ["208800000X"],
    searchTerms: ["Urology"],
    procedures: ["Prostate resection"],
  },
  ophthalmology: {
    id: "ophthalmology",
    label: "Ophthalmology",
    plain: "Eye specialist",
    taxonomyCodes: ["207W00000X", "207WX0107X", "207WX0200X", "207WX0009X"],
    searchTerms: ["Ophthalmology"],
    procedures: ["Cataract surgery"],
  },
  ent: {
    id: "ent",
    label: "Otolaryngology (ENT)",
    plain: "Ear, nose & throat specialist",
    taxonomyCodes: ["207Y00000X", "207YS0123X", "207YX0905X"],
    searchTerms: ["Otolaryngology"],
    procedures: [],
  },
  infectious_disease: {
    id: "infectious_disease",
    label: "Infectious disease",
    plain: "Infection specialist",
    taxonomyCodes: ["207RI0200X"],
    searchTerms: ["Infectious Disease"],
    procedures: [],
  },
  allergy: {
    id: "allergy",
    label: "Allergy & immunology",
    plain: "Allergy specialist",
    taxonomyCodes: ["207K00000X", "207KA0200X"],
    searchTerms: ["Allergy & Immunology"],
    procedures: [],
  },
  general_surgery: {
    id: "general_surgery",
    label: "General surgery",
    plain: "Surgeon",
    taxonomyCodes: ["208600000X"],
    searchTerms: ["Surgery"],
    procedures: ["Hernia repair (minimally invasive)", "Hernia repair - groin (open)", "Removal of tissue"],
  },
  primary_care: {
    id: "primary_care",
    label: "Primary care",
    plain: "Family or internal medicine doctor",
    taxonomyCodes: ["207Q00000X", "207R00000X", "207QA0505X"],
    searchTerms: ["Family Medicine", "Internal Medicine"],
    procedures: [],
  },
};

export const SPECIALTY_LIST = Object.values(SPECIALTIES);

export function specialtyForTaxonomy(code: string): Specialty | undefined {
  return SPECIALTY_LIST.find((s) => s.taxonomyCodes.includes(code));
}

// ICD-10-CM chapter → default specialty. Used when a condition is found in
// the NLM ICD-10 lookup but isn't in our hand-curated lexicon.
export function specialtyForIcd10(code: string): SpecialtyId {
  const c = code.toUpperCase();
  const letter = c[0];
  const num = parseInt(c.slice(1, 3), 10);
  if (letter === "C" || (letter === "D" && num <= 49)) return "oncology";
  if (letter === "D") return "hematology";
  if (letter === "E") return num >= 0 && num <= 35 ? "endocrinology" : "primary_care";
  if (letter === "F") return "psychiatry";
  if (letter === "G") return "neurology";
  if (letter === "H") return num <= 59 ? "ophthalmology" : "ent";
  if (letter === "I") return "cardiology";
  if (letter === "J") return num <= 39 ? "ent" : "pulmonology";
  if (letter === "K") return "gastroenterology";
  if (letter === "L") return "dermatology";
  if (letter === "M") return num >= 5 && num <= 36 ? "rheumatology" : "orthopedics";
  if (letter === "N") return num <= 29 ? "nephrology" : num <= 53 ? "urology" : "obgyn";
  if (letter === "O") return "obgyn";
  if (letter === "A" || letter === "B") return "infectious_disease";
  if (letter === "S" || letter === "T") return "orthopedics";
  return "primary_care";
}

import { lookupNpi, type Provider } from "../sources/nppes";
import { getMipsScores, getAffiliations } from "../sources/cms";
import { SPECIALTIES, type SpecialtyId } from "../specialties";

// Doctor onboarding verification. Every claim on an application is checked
// against the federal NPPES record for that NPI (and CMS for a public-reporting
// footprint). Nothing is taken on the applicant's word.

export type CheckResult = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  critical: boolean;
};

export type VerificationReport = {
  // NPPES data (including licenses) is public, so matching it never proves who
  // is applying. The automatic result is at most needs_review.
  decision: "needs_review" | "rejected";
  registryMatch: boolean; // every automatic check that matters passed
  checks: CheckResult[];
  provider?: Pick<Provider, "npi" | "firstName" | "lastName" | "credential" | "address" | "taxonomies" | "enumerationDate" | "lastUpdated">;
  checkedAt: string;
};

export type ApplicantClaims = {
  npi: string;
  firstName: string;
  lastName: string;
  specialty: SpecialtyId;
  licenseState: string;
  licenseNumber: string;
  practiceZip: string;
};

// NPI check digit: Luhn over "80840" + first 9 digits (CMS NPI standard).
export function isValidNpi(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const digits = ("80840" + npi.slice(0, 9)).split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1, dbl = true; i >= 0; i--, dbl = !dbl) {
    let d = digits[i];
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(npi[9]);
}

export const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const NICKNAMES: Record<string, string[]> = {
  william: ["bill", "will", "billy", "liam"],
  robert: ["bob", "rob", "bobby"],
  richard: ["rick", "rich", "dick"],
  elizabeth: ["liz", "beth", "eliza", "betsy"],
  katherine: ["kate", "kathy", "katie", "kat"],
  catherine: ["cathy", "kate", "cat"],
  michael: ["mike", "mikey"],
  jennifer: ["jen", "jenny"],
  james: ["jim", "jimmy", "jamie"],
  joseph: ["joe", "joey"],
  thomas: ["tom", "tommy"],
  christopher: ["chris"],
  margaret: ["maggie", "meg", "peggy"],
  daniel: ["dan", "danny"],
  anthony: ["tony"],
  alexander: ["alex"],
  samuel: ["sam"],
  benjamin: ["ben"],
  nicholas: ["nick"],
  jonathan: ["jon"],
  steven: ["steve"],
  stephen: ["steve"],
  edward: ["ed", "ted"],
};

export function firstNameMatches(claimed: string, official: string): boolean {
  const a = normName(claimed);
  const b = normName(official);
  if (!a || !b) return false;
  if (a === b) return true;
  if (NICKNAMES[b]?.includes(a) || NICKNAMES[a]?.includes(b)) return true;
  return false;
}

export function lastNameMatches(claimed: string, official: string): boolean {
  const a = normName(claimed);
  const b = normName(official);
  if (!a || !b) return false;
  // Hyphenated / compound surnames: accept if one fully contains the other part.
  return a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b));
}

export const normLicense = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^0+/, "");

export function licenseMatches(claimed: string, official: string): boolean {
  const a = normLicense(claimed);
  const b = normLicense(official);
  if (!a || !b) return false;
  if (a === b) return true;
  // State boards often prefix letters (e.g. CA "A123456" / "G15155"). Compare digits.
  const da = a.replace(/^[A-Z]+/, "").replace(/^0+/, "");
  const db = b.replace(/^[A-Z]+/, "").replace(/^0+/, "");
  return da.length >= 4 && da === db;
}

export async function verifyApplication(c: ApplicantClaims): Promise<VerificationReport> {
  const checks: CheckResult[] = [];
  const push = (x: CheckResult) => checks.push(x);
  const npi = c.npi.trim();

  const formatOk = isValidNpi(npi);
  push({
    id: "npi_format",
    label: "NPI format and check digit",
    status: formatOk ? "pass" : "fail",
    detail: formatOk ? "10 digits with a valid Luhn check digit." : "Not a valid NPI — the check digit doesn't match.",
    critical: true,
  });
  if (!formatOk) return finish(checks);

  const { raw, provider } = await lookupNpi(npi);
  if (!raw) {
    push({ id: "npi_exists", label: "NPI found in NPPES", status: "fail", detail: "No provider with this NPI in the federal NPPES registry.", critical: true });
    return finish(checks);
  }
  push({ id: "npi_exists", label: "NPI found in NPPES", status: "pass", detail: "Record found in the CMS NPI Registry.", critical: true });

  const individual = raw.enumeration_type === "NPI-1";
  push({
    id: "individual",
    label: "Registered as an individual clinician",
    status: individual ? "pass" : "fail",
    detail: individual ? "Type 1 (individual) NPI." : "This is an organization NPI (Type 2). Apply with your personal NPI.",
    critical: true,
  });
  const active = (raw.basic.status ?? "A") === "A";
  push({
    id: "active",
    label: "NPI is active",
    status: active ? "pass" : "fail",
    detail: active ? "Status: active." : "This NPI has been deactivated.",
    critical: true,
  });
  if (!individual || !active) return finish(checks);

  const officialFirst = raw.basic.first_name ?? "";
  const officialLast = raw.basic.last_name ?? "";
  const lastOk = lastNameMatches(c.lastName, officialLast);
  const firstOk = firstNameMatches(c.firstName, officialFirst);
  push({
    id: "name",
    label: "Name matches the NPI record",
    status: lastOk && firstOk ? "pass" : lastOk ? "warn" : "fail",
    detail: `Registry name: ${provider?.firstName} ${provider?.lastName}${provider?.credential ? `, ${provider.credential}` : ""}.` +
      (lastOk && !firstOk ? " First name differs — confirm with ID." : ""),
    critical: true,
  });

  const spec = SPECIALTIES[c.specialty];
  const specTax = raw.taxonomies.find((t) => spec.taxonomyCodes.includes(t.code));
  push({
    id: "specialty",
    label: `Registered taxonomy includes ${spec.label}`,
    status: specTax ? "pass" : "warn",
    detail: specTax
      ? `${specTax.desc} (${specTax.code}).`
      : `Registry lists: ${raw.taxonomies.map((t) => t.desc).join("; ") || "none"}. Reviewer must confirm board certification.`,
    critical: false,
  });

  const licenses = raw.taxonomies.filter((t) => t.license);
  const lic = licenses.find((t) => licenseMatches(c.licenseNumber, t.license!) && (!t.state || t.state === c.licenseState.toUpperCase()));
  push({
    id: "license",
    label: "State license matches NPPES",
    status: lic ? "pass" : licenses.length ? "fail" : "warn",
    detail: lic
      ? `License ${lic.license} (${lic.state}) on file.`
      : licenses.length
      ? `License on file: ${licenses.map((t) => `${t.license} (${t.state})`).join(", ")}. Claimed ${c.licenseNumber} (${c.licenseState}).`
      : "No license number in NPPES for this NPI — verify with the state medical board.",
    critical: false,
  });

  const loc = raw.addresses.find((a) => a.address_purpose === "LOCATION");
  const locZip = (loc?.postal_code ?? "").slice(0, 5);
  const inUS = loc?.country_code === "US";
  const sameArea = inUS && locZip.slice(0, 3) === c.practiceZip.slice(0, 3);
  const sameState = inUS && loc?.state === c.licenseState.toUpperCase();
  push({
    id: "location",
    label: "Practice location consistent with registry",
    status: !inUS ? "fail" : sameArea ? "pass" : "warn",
    detail:
      `Registry practice address: ${provider?.address.line1}, ${provider?.address.city}, ${loc?.state} ${locZip}${inUS ? "" : ` (${loc?.country_code})`}.` +
      (!inUS
        ? " Practice location is outside the US — update NPPES before you can receive referrals."
        : sameArea
        ? ""
        : sameState
        ? " Different ZIP from the one you entered — update NPPES if you've moved."
        : " Different state from your license — update NPPES if you've moved."),
    critical: false,
  });

  const updated = raw.basic.last_updated ? new Date(raw.basic.last_updated) : null;
  const stale = updated ? Date.now() - updated.getTime() > 5 * 365 * 24 * 3600 * 1000 : true;
  push({
    id: "freshness",
    label: "Registry record recently maintained",
    status: stale ? "warn" : "pass",
    detail: updated ? `Last updated ${raw.basic.last_updated}.` : "No last-updated date.",
    critical: false,
  });

  try {
    const [mips, aff] = await Promise.all([getMipsScores([npi]), getAffiliations([npi])]);
    const m = mips.get(npi);
    const hosp = aff.get(npi)?.length ?? 0;
    push({
      id: "cms_footprint",
      label: "Appears in CMS public reporting",
      status: m || hosp ? "pass" : "warn",
      detail:
        [m ? `MIPS final score ${m.finalScore.toFixed(1)}` : null, hosp ? `${hosp} hospital affiliation${hosp > 1 ? "s" : ""}` : null]
          .filter(Boolean)
          .join(" · ") || "Not in CMS Doctors & Clinicians data (common for non-Medicare practices).",
      critical: false,
    });
  } catch {
    push({ id: "cms_footprint", label: "Appears in CMS public reporting", status: "warn", detail: "CMS data was unreachable; re-run later.", critical: false });
  }

  return finish(checks, provider ?? undefined);
}

function finish(checks: CheckResult[], provider?: Provider): VerificationReport {
  const criticalFail = checks.some((c) => c.critical && c.status === "fail");
  const anyFail = checks.some((c) => c.status === "fail");
  const mustPass = ["name", "license"].every((id) => checks.find((c) => c.id === id)?.status === "pass");
  const registryMatch = !criticalFail && !anyFail && mustPass && checks.find((c) => c.id === "specialty")?.status === "pass";
  const decision = criticalFail ? "rejected" : "needs_review";
  return {
    decision,
    registryMatch,
    checks,
    provider: provider && {
      npi: provider.npi,
      firstName: provider.firstName,
      lastName: provider.lastName,
      credential: provider.credential,
      address: provider.address,
      taxonomies: provider.taxonomies,
      enumerationDate: provider.enumerationDate,
      lastUpdated: provider.lastUpdated,
    },
    checkedAt: new Date().toISOString(),
  };
}

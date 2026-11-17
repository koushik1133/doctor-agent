import { geocodeZip, haversineMiles, type GeoPoint } from "../sources/geo";
import { searchProviders, type Provider } from "../sources/nppes";
import { getAffiliations, getHospitals, getMipsScores, getUtilization, type Hospital } from "../sources/cms";
import { SPECIALTIES, type SpecialtyId } from "../specialties";
import { mapLimit } from "../http";
import { store, platformSuccess, capacityFor, type Capacity, type DoctorApplication } from "../store";
import { score, hospitalOutcomeScore, type ScoreResult } from "./score";

export type MatchedDoctor = {
  npi: string;
  name: string;
  credential?: string;
  specialty: SpecialtyId;
  taxonomy: string;
  address: Provider["address"];
  distanceMiles: number;
  hospital?: Pick<Hospital, "ccn" | "name" | "rating" | "city" | "state">;
  mipsScore?: number;
  procedures: { category: string; count?: number; percentile?: number }[];
  yearsRegistered?: number;
  platform?: { verified: boolean; acceptingNew: boolean; telehealth: boolean; languages: string[]; bio?: string; capacity?: Capacity; success?: { rate: number; n: number; avgRating?: number } };
  score: ScoreResult;
};

export type MatchResponse = {
  origin: GeoPoint;
  specialty: { id: SpecialtyId; label: string; plain: string };
  radiusMiles: number;
  searched: number;
  withinRadius: number;
  doctors: MatchedDoctor[];
  sources: string[];
  tookMs: number;
};

export class MatchError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function matchDoctors(opts: { zip: string; specialty: SpecialtyId; radiusMiles?: number; limit?: number }): Promise<MatchResponse> {
  const t0 = Date.now();
  const spec = SPECIALTIES[opts.specialty];
  if (!spec) throw new MatchError("Unknown specialty.");
  const radius = Math.min(Math.max(opts.radiusMiles ?? 25, 2), 100);
  const origin = await geocodeZip(opts.zip);
  if (!origin) throw new MatchError("We couldn't find that ZIP code. Enter a 5-digit US ZIP.");

  // 1. Candidates from NPPES, ZIP-prefix area (+ state-wide for wide radii).
  const prefix = origin.zip.slice(0, 3);
  const searches: Parameters<typeof searchProviders>[0][] = spec.searchTerms.map((term) => ({ taxonomyDescription: term, zipPrefix: prefix, pages: 3 }));
  if (radius > 40) searches.push(...spec.searchTerms.map((term) => ({ taxonomyDescription: term, state: origin.state, pages: 2 })));
  const lists = await mapLimit(searches, 3, (s) => searchProviders(s));
  const byNpi = new Map<string, Provider>();
  for (const p of lists.flat()) {
    if (!p.taxonomies.some((t) => spec.taxonomyCodes.includes(t.code))) continue;
    byNpi.set(p.npi, p);
  }

  // 2. Verified doctors who applied through the platform.
  const apps = (await store().listApplications()).filter((a) => a.status === "verified" && a.specialty === spec.id);
  const appByNpi = new Map<string, DoctorApplication>(apps.map((a) => [a.npi, a]));
  for (const a of apps) {
    if (byNpi.has(a.npi) || !a.verification.provider) continue;
    const vp = a.verification.provider;
    byNpi.set(a.npi, { ...vp, active: true, primaryTaxonomy: vp.taxonomies.find((t) => t.primary) } as Provider);
  }

  // 3. Distance filter.
  const zips = [...new Set([...byNpi.values()].map((p) => appByNpi.get(p.npi)?.practiceZip ?? p.address.zip))];
  const geo = new Map<string, GeoPoint | null>();
  await mapLimit(zips, 8, async (z) => geo.set(z, await geocodeZip(z).catch(() => null)));
  const near = [...byNpi.values()]
    .map((p) => {
      const g = geo.get(appByNpi.get(p.npi)?.practiceZip ?? p.address.zip);
      return g ? { p, d: haversineMiles(origin, g) } : null;
    })
    .filter((x): x is { p: Provider; d: number } => !!x && x.d <= radius)
    .sort((a, b) => a.d - b.d);
  const withinRadius = near.length;
  // Enrich the 150 closest (CMS lookups are batched by NPI), but never drop a
  // verified platform doctor who is inside the radius.
  const keep = near.slice(0, 150);
  for (const x of near.slice(150)) if (appByNpi.has(x.p.npi)) keep.push(x);
  near.splice(0, near.length, ...keep);

  // 4. Enrich with CMS quality, volume, hospital outcomes, platform outcomes.
  const npis = near.map((x) => x.p.npi);
  const [mips, util, aff, referrals] = await Promise.all([
    getMipsScores(npis).catch(() => new Map()),
    getUtilization(npis).catch(() => new Map()),
    getAffiliations(npis).catch(() => new Map<string, string[]>()),
    store().listReferrals(npis),
  ]);
  const hospitals = await getHospitals([...new Set([...aff.values()].flat())]).catch(() => new Map<string, Hospital>());

  const doctors: MatchedDoctor[] = near.map(({ p, d }) => {
    const app = appByNpi.get(p.npi);
    const procs = (util.get(p.npi) ?? []) as MatchedDoctor["procedures"];
    const relevant = procs.filter((x) => spec.procedures.includes(x.category));
    const bestProc = relevant.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0];
    const hospList = ((aff.get(p.npi) ?? []) as string[]).map((c) => hospitals.get(c))
      .filter((h): h is Hospital => !!h && h.state === p.address.state); // only hospitals the patient could realistically use
    const hospScore = (h: Hospital) => hospitalOutcomeScore({ rating: h.rating, ...h.mortality }) ?? 0;
    const bestHosp = hospList.sort((a, b) => hospScore(b) - hospScore(a))[0];
    const success = platformSuccess(referrals.filter((r) => r.npi === p.npi));
    const capacity = app ? capacityFor(app, referrals) : undefined;
    const years = p.enumerationDate ? (Date.now() - new Date(p.enumerationDate).getTime()) / (365.25 * 24 * 3600 * 1000) : undefined;
    const tax = p.taxonomies.find((t) => spec.taxonomyCodes.includes(t.code))!;
    const s = score({
      distanceMiles: d,
      radiusMiles: radius,
      mipsScore: mips.get(p.npi)?.finalScore,
      procedurePercentile: bestProc?.percentile,
      procedureCount: bestProc?.count,
      yearsRegistered: years,
      hospital: bestHosp ? { rating: bestHosp.rating, ...bestHosp.mortality } : undefined,
      platform: success ?? undefined,
      primaryMatch: !!p.primaryTaxonomy && spec.taxonomyCodes.includes(p.primaryTaxonomy.code),
      verifiedOnPlatform: !!app,
      acceptingNew: capacity?.accepting,
    });
    return {
      npi: p.npi,
      name: `Dr. ${p.firstName} ${p.lastName}`,
      credential: p.credential,
      specialty: spec.id,
      taxonomy: tax?.desc ?? spec.label,
      address: p.address,
      distanceMiles: Math.round(d * 10) / 10,
      hospital: bestHosp ? { ccn: bestHosp.ccn, name: bestHosp.name, rating: bestHosp.rating, city: bestHosp.city, state: bestHosp.state } : undefined,
      mipsScore: mips.get(p.npi)?.finalScore,
      procedures: relevant,
      yearsRegistered: years ? Math.floor(years) : undefined,
      platform: app
        ? { verified: true, acceptingNew: capacity!.accepting, telehealth: app.telehealth, languages: app.languages, bio: app.bio, capacity, success: success ?? undefined }
        : success
        ? { verified: false, acceptingNew: false, telehealth: false, languages: [], success }
        : undefined,
      score: s,
    };
  });

  doctors.sort((a, b) => b.score.total - a.score.total);
  return {
    origin,
    specialty: { id: spec.id, label: spec.label, plain: spec.plain },
    radiusMiles: radius,
    searched: byNpi.size,
    withinRadius,
    doctors: doctors.slice(0, opts.limit ?? 20),
    sources: [
      "CMS NPPES NPI Registry",
      "CMS Quality Payment Program — PY2024 MIPS",
      "CMS Doctors & Clinicians — utilization & facility affiliation",
      "CMS Hospital General Information — star ratings & outcome measures",
    ],
    tookMs: Date.now() - t0,
  };
}

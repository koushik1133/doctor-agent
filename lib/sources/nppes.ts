import { fetchJson } from "../http";

// CMS NPPES NPI Registry — the authoritative public list of every US
// healthcare provider. https://npiregistry.cms.hhs.gov/api-page

const BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1";

type RawAddress = {
  address_1: string;
  address_2?: string;
  address_purpose: "LOCATION" | "MAILING";
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  telephone_number?: string;
};

type RawTaxonomy = { code: string; desc: string; primary: boolean; state?: string | null; license?: string | null };

export type RawNpiResult = {
  number: string;
  enumeration_type: "NPI-1" | "NPI-2";
  basic: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    credential?: string;
    sex?: string;
    status?: string;
    enumeration_date?: string;
    last_updated?: string;
    organization_name?: string;
  };
  addresses: RawAddress[];
  taxonomies: RawTaxonomy[];
};

type RawResponse = { result_count?: number; results?: RawNpiResult[]; Errors?: { description: string }[] };

export type Provider = {
  npi: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  credential?: string;
  sex?: string;
  active: boolean;
  enumerationDate?: string;
  lastUpdated?: string;
  address: { line1: string; line2?: string; city: string; state: string; zip: string; country?: string; phone?: string };
  taxonomies: { code: string; desc: string; primary: boolean; state?: string; license?: string }[];
  primaryTaxonomy?: { code: string; desc: string };
};

export function titleCase(s = ""): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function toProvider(r: RawNpiResult, opts: { allowForeign?: boolean } = {}): Provider | null {
  if (r.enumeration_type !== "NPI-1") return null;
  const loc = r.addresses.find((a) => a.address_purpose === "LOCATION") ?? r.addresses[0];
  if (!loc || (loc.country_code !== "US" && !opts.allowForeign)) return null;
  const tax = r.taxonomies.map((t) => ({
    code: t.code,
    desc: t.desc,
    primary: t.primary,
    state: t.state ?? undefined,
    license: t.license ?? undefined,
  }));
  const primary = tax.find((t) => t.primary) ?? tax[0];
  return {
    npi: r.number,
    firstName: titleCase(r.basic.first_name),
    lastName: titleCase(r.basic.last_name),
    middleName: r.basic.middle_name ? titleCase(r.basic.middle_name) : undefined,
    credential: r.basic.credential?.replace(/\./g, "").trim().toUpperCase() || undefined,
    sex: r.basic.sex,
    active: (r.basic.status ?? "A") === "A",
    enumerationDate: r.basic.enumeration_date,
    lastUpdated: r.basic.last_updated,
    address: {
      line1: titleCase(loc.address_1),
      line2: loc.address_2 ? titleCase(loc.address_2) : undefined,
      city: titleCase(loc.city),
      state: loc.state,
      zip: (loc.postal_code || "").slice(0, 5),
      country: loc.country_code,
      phone: loc.telephone_number,
    },
    taxonomies: tax,
    primaryTaxonomy: primary ? { code: primary.code, desc: primary.desc } : undefined,
  };
}

export async function lookupNpi(npi: string): Promise<{ raw: RawNpiResult | null; provider: Provider | null }> {
  const data = await fetchJson<RawResponse>(`${BASE}&number=${encodeURIComponent(npi)}`, {
    source: "NPPES",
    ttlMs: 6 * 3600 * 1000,
  });
  const raw = data.results?.[0] ?? null;
  return { raw, provider: raw ? toProvider(raw, { allowForeign: true }) : null };
}

// Search individual providers by taxonomy text in a ZIP-prefix area (e.g. "941*"
// covers San Francisco). Filters to US practice locations. Pages up to `pages`.
export async function searchProviders(params: {
  taxonomyDescription: string;
  zipPrefix?: string;
  state?: string;
  city?: string;
  pages?: number;
}): Promise<Provider[]> {
  const out: Provider[] = [];
  const pages = params.pages ?? 2;
  for (let page = 0; page < pages; page++) {
    const q = new URLSearchParams({
      taxonomy_description: params.taxonomyDescription,
      enumeration_type: "NPI-1",
      limit: "200",
      skip: String(page * 200),
    });
    if (params.zipPrefix) q.set("postal_code", `${params.zipPrefix}*`);
    if (params.state) q.set("state", params.state);
    if (params.city) q.set("city", params.city);
    const data = await fetchJson<RawResponse>(`${BASE}&${q.toString()}`, { source: "NPPES" });
    if (data.Errors?.length) throw new Error(`NPPES: ${data.Errors.map((e) => e.description).join("; ")}`);
    const batch = data.results ?? [];
    for (const r of batch) {
      const p = toProvider(r);
      if (p && p.active) out.push(p);
    }
    if (batch.length < 200) break;
  }
  return out;
}

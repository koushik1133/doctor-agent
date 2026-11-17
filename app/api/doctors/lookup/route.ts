import { NextRequest, NextResponse } from "next/server";
import { lookupNpi } from "@/lib/sources/nppes";
import { isValidNpi } from "@/lib/verification/verify";
import { specialtyForTaxonomy } from "@/lib/specialties";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Lets the application form pre-fill from the public NPPES record.
export async function GET(req: NextRequest) {
  if (!rateLimit(req, "lookup", 30)) return NextResponse.json({ error: "Too many lookups." }, { status: 429 });
  const npi = req.nextUrl.searchParams.get("npi") ?? "";
  if (!isValidNpi(npi)) return NextResponse.json({ error: "That isn't a valid NPI (check the 10 digits)." }, { status: 400 });
  const { provider, raw } = await lookupNpi(npi);
  if (!raw) return NextResponse.json({ error: "No provider with this NPI in the NPPES registry." }, { status: 404 });
  if (!provider) return NextResponse.json({ error: "This is an organization NPI. Use your individual NPI." }, { status: 422 });
  const lic = provider.taxonomies.find((t) => t.primary && t.license) ?? provider.taxonomies.find((t) => t.license);
  const spec = provider.taxonomies.map((t) => specialtyForTaxonomy(t.code)).find(Boolean);
  return NextResponse.json({
    npi,
    firstName: provider.firstName,
    lastName: provider.lastName,
    credential: provider.credential,
    taxonomy: provider.primaryTaxonomy?.desc,
    specialty: spec?.id ?? null,
    licenseState: lic?.state ?? provider.address.state,
    practiceZip: provider.address.country === "US" ? provider.address.zip : "",
    city: provider.address.city,
    state: provider.address.state,
  });
}

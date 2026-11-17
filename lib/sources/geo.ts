import { fetchJson, UpstreamError } from "../http";

export type GeoPoint = { lat: number; lng: number; city: string; state: string; zip: string };

type ZippoResponse = {
  "post code": string;
  places: { "place name": string; latitude: string; longitude: string; "state abbreviation": string }[];
};

export function normalizeZip(raw: string): string | null {
  const m = String(raw).trim().match(/^(\d{5})(?:-?\d{4})?$/);
  return m ? m[1] : null;
}

// ZIP centroid lookup via Zippopotam.us (free, no key, US Census-derived).
export async function geocodeZip(raw: string): Promise<GeoPoint | null> {
  const zip = normalizeZip(raw);
  if (!zip) return null;
  try {
    const data = await fetchJson<ZippoResponse>(`https://api.zippopotam.us/us/${zip}`, {
      source: "zippopotam",
      ttlMs: 30 * 24 * 3600 * 1000,
      timeoutMs: 8000,
    });
    const p = data.places?.[0];
    if (!p) return null;
    return {
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      city: p["place name"],
      state: p["state abbreviation"],
      zip,
    };
  } catch (e) {
    if (e instanceof UpstreamError && e.status === 404) return null;
    throw e;
  }
}

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

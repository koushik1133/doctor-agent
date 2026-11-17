import type { NextRequest } from "next/server";

// Fixed-window in-memory limiter. Good enough for a single instance; swap for
// Upstash/Redis when running multiple replicas.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(req: NextRequest, bucket: string, max: number, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  cur.n++;
  return cur.n <= max;
}

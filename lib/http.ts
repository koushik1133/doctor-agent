import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Small fetch wrapper for the public data APIs we depend on (NPPES, CMS, NLM,
// Zippopotam). Adds a timeout, one retry, and a TTL cache (memory + disk) so
// repeated searches don't hammer government endpoints.

// Lives outside the project so cloud-synced folders (iCloud Desktop/Documents,
// Dropbox) can't offload cache files — reading an offloaded file blocks.
export const CACHE_ROOT = process.env.CACHE_DIR || path.join(os.tmpdir(), "doctor-agent-cache");
const CACHE_DIR = path.join(CACHE_ROOT, "http");
const memory = new Map<string, { at: number; value: unknown }>();

export class UpstreamError extends Error {
  constructor(public source: string, message: string, public status?: number) {
    super(`${source}: ${message}`);
  }
}

type Opts = { source: string; ttlMs?: number; timeoutMs?: number };

export async function fetchJson<T>(url: string, opts: Opts): Promise<T> {
  const ttl = opts.ttlMs ?? 24 * 60 * 60 * 1000;
  const key = createHash("sha1").update(url).digest("hex");
  const now = Date.now();

  const hit = memory.get(key);
  if (hit && now - hit.at < ttl) return hit.value as T;

  const file = path.join(CACHE_DIR, `${key}.json`);
  if (process.env.DISABLE_DISK_CACHE !== "1") {
    try {
      const raw = JSON.parse(await readFile(file, "utf8")) as { at: number; value: T };
      if (now - raw.at < ttl) {
        memory.set(key, raw);
        return raw.value;
      }
    } catch {
      /* miss */
    }
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "doctor-agent/0.2 (open-source referral matcher)" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
      });
      if (!res.ok) throw new UpstreamError(opts.source, `HTTP ${res.status}`, res.status);
      const value = (await res.json()) as T;
      memory.set(key, { at: now, value });
      if (process.env.DISABLE_DISK_CACHE !== "1") {
        await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
        await writeFile(file, JSON.stringify({ at: now, value })).catch(() => {});
      }
      return value;
    } catch (e) {
      lastErr = e;
      if (e instanceof UpstreamError && e.status && e.status < 500 && e.status !== 429) break;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  if (lastErr instanceof UpstreamError) throw lastErr;
  throw new UpstreamError(opts.source, lastErr instanceof Error ? lastErr.message : "request failed");
}

// Run async work over items with bounded concurrency.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

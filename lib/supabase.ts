import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Clients are created lazily so the app can boot (and the doctor-matching
// features can run on the local file store) without Supabase configured.

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function lazy(make: () => SupabaseClient): SupabaseClient {
  let client: SupabaseClient | null = null;
  return new Proxy({} as SupabaseClient, {
    get(_t, prop) {
      if (!client) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and keys in .env.local.");
        }
        client = make();
      }
      const v = (client as unknown as Record<string | symbol, unknown>)[prop];
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(client) : v;
    },
  });
}

// Public client (browser-safe, RLS applies)
export const supabase = lazy(() =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
);

// Admin client (server-only, bypasses RLS)
export const supabaseAdmin = lazy(() =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
);

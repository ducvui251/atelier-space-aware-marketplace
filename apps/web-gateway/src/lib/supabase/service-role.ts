import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Elevated, stateless Supabase client for server-side Storage writes
 * (G-05). Unlike `./server.ts` (cookie-bound, anon key, respects RLS as the
 * calling user), this uses the service-role key, which bypasses RLS
 * entirely — it must never be exposed to the browser, never prefixed
 * `NEXT_PUBLIC_`, and is only read here, at the point of use, so a missing
 * key fails the one route that needs it instead of every route at
 * startup (the feature is optional until the bucket is provisioned; see
 * runbooks/image-upload-setup.md).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — see runbooks/image-upload-setup.md");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

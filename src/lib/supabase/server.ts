import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Server-only Admin Client using Service Role Key.
 * NEVER expose to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin server client.");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a scoped Supabase client with a user's JWT.
 * Enforces PostgreSQL Row-Level Security (RLS) under that user's identity.
 */
export function createScopedUserClient(userJwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

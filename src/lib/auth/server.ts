import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getSupabaseConfig, SESSION_COOKIE_OPTIONS, type SupabaseConfig } from "@/lib/auth/config";
import type { Database } from "@/lib/db/types";

/*
 * Supabase access for Server Components, Server Actions and Route Handlers.
 * A new client is created for every request, as `@supabase/ssr` requires.
 */

export type CodeBuddyClient = SupabaseClient<Database>;

export async function createSupabaseClient(config: SupabaseConfig): Promise<CodeBuddyClient> {
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * A client that acts as the signed-in user, so the database's row-level
 * security applies. `null` when Supabase isn't configured.
 */
export async function getSupabase(): Promise<CodeBuddyClient | null> {
  // The client reads the clock to check the session, so this must run at
  // request time, never while a page is being prerendered.
  await connection();
  const config = getSupabaseConfig();
  return config ? createSupabaseClient(config) : null;
}

export interface SignedInUser {
  id: string;
  email: string | null;
}

/**
 * The user behind this request, or `null`. `getClaims()` verifies the
 * session token instead of trusting the cookie, so this is safe to use for
 * access decisions. Cached per request, so the shell and a page can both ask.
 */
export const getSignedInUser = cache(async (): Promise<SignedInUser | null> => {
  // Always decide at request time, even when Supabase isn't configured at build time.
  await connection();
  const config = getSupabaseConfig();
  if (!config) return null;
  const supabase = await createSupabaseClient(config);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
});

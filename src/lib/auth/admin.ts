import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getSupabaseSecretKey } from "@/lib/auth/config";

/*
 * The only code that uses Supabase's secret key: creating an account with a
 * class code, and deleting an account. Each call gets a fresh client that
 * never stores a session or sets cookies.
 */

const STATELESS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export type PasswordCheck = "ok" | "wrong" | "rate_limited" | "unavailable";

/**
 * Checks a password without touching the browser's session: it signs in on a
 * throwaway client, then ends that extra session straight away.
 */
export async function verifyPassword(email: string, password: string): Promise<PasswordCheck> {
  const config = getSupabaseConfig();
  if (!config) return "unavailable";
  const client = createClient(config.url, config.publishableKey, STATELESS);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return "wrong";
    if (error.status === 429) return "rate_limited";
    console.error("[auth]", "verify-password", error.code ?? error.status ?? "-");
    return "unavailable";
  }
  await client.auth.signOut({ scope: "local" });
  return "ok";
}

/** Whether this server can create and delete accounts at all. */
export function canManageAccounts(): boolean {
  return Boolean(getSupabaseConfig() && getSupabaseSecretKey());
}

export type CreateUserResult = "ok" | "exists" | "weak_password" | "unavailable";

/**
 * Creates an account that is already confirmed, so no email is sent. This
 * works while public sign-up is switched off in Supabase, which keeps the
 * class code the only way in.
 */
export async function createConfirmedUser(email: string, password: string): Promise<CreateUserResult> {
  const config = getSupabaseConfig();
  const secretKey = getSupabaseSecretKey();
  if (!config || !secretKey) return "unavailable";
  const admin = createClient(config.url, secretKey, STATELESS);
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error) return "ok";
  if (error.code === "email_exists" || error.code === "user_already_exists") return "exists";
  if (error.code === "weak_password") return "weak_password";
  console.error("[auth]", "create-user", error.code ?? error.status ?? "-");
  return "unavailable";
}

/**
 * Deletes the user from Supabase Auth. The database removes their history
 * and Practice progress with it (`on delete cascade`).
 */
export async function deleteUserById(userId: string): Promise<boolean> {
  const config = getSupabaseConfig();
  const secretKey = getSupabaseSecretKey();
  if (!config || !secretKey) return false;
  const admin = createClient(config.url, secretKey, STATELESS);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[auth]", "delete-user", error.code ?? error.status ?? "-");
    return false;
  }
  return true;
}

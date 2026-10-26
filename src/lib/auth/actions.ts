"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canDeleteAccounts, deleteUserById, verifyPassword } from "@/lib/auth/admin";
import { getSupabaseConfig } from "@/lib/auth/config";
import { loginPathFor, safeNextPath } from "@/lib/auth/paths";
import { createSupabaseClient, getSignedInUser } from "@/lib/auth/server";
import {
  hasFieldErrors,
  validateAccountDeletion,
  validateNewPassword,
  validateSignIn,
  type AuthFormState,
} from "@/lib/auth/validation";

/*
 * Sign-in, sign-out and password changes. Accounts are created by the person
 * running CodeBuddy in the Supabase dashboard, so there is no sign-up here.
 * Supabase's own error text never reaches the page; only its error code is
 * logged.
 */

const NOT_CONFIGURED = "Sign-in isn’t set up on this server yet. Ask the person running CodeBuddy.";
const UNAVAILABLE = "Sign-in isn’t working right now. Try again in a little while.";
const DELETE_UNAVAILABLE = "Your password couldn’t be checked right now. Nothing was deleted. Try again in a little while.";

function logAuthFailure(action: string, code: string | number | undefined): void {
  console.error("[auth]", action, code ?? "-");
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fieldErrors = validateSignIn(email, password);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors, email };

  const config = getSupabaseConfig();
  if (!config) return { message: NOT_CONFIGURED, email };

  const supabase = await createSupabaseClient(config);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") {
      return { message: "That email and password don’t match. Check them and try again.", email };
    }
    logAuthFailure("sign-in", error.code ?? error.status);
    if (error.status === 429) {
      return { message: "Too many sign-in attempts. Wait a few minutes, then try again.", email };
    }
    return { message: UNAVAILABLE, email };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const config = getSupabaseConfig();
  if (config) {
    const supabase = await createSupabaseClient(config);
    // This browser only; the user stays signed in on their other devices.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) logAuthFailure("sign-out", error.code ?? error.status);
  }
  redirect("/");
}

export async function changePassword(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fieldErrors = validateNewPassword(password, confirm);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors };

  const config = getSupabaseConfig();
  if (!config) return { message: NOT_CONFIGURED };

  const supabase = await createSupabaseClient(config);
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(loginPathFor("/account"));

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: "That’s already your password. Choose a different one." } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "That password is too easy to guess. Choose a longer or less common one." } };
    }
    logAuthFailure("change-password", error.code ?? error.status);
    if (error.code === "reauthentication_needed") {
      return { message: "For your security, sign out, sign in again, then change your password." };
    }
    return { message: UNAVAILABLE };
  }
  return { ok: true, message: "Your password has been changed." };
}

/**
 * Deletes the signed-in user's account and, through the database, all their
 * history and Practice progress. Asks for the password again, so nobody can
 * do this from a computer someone left signed in.
 */
export async function deleteAccount(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const understood = formData.get("understood") === "on";
  const fieldErrors = validateAccountDeletion(password, understood);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors };

  const user = await getSignedInUser();
  if (!user) redirect(loginPathFor("/account"));
  if (!canDeleteAccounts()) {
    return { message: "Deleting accounts isn’t set up on this server yet. Ask the person running CodeBuddy." };
  }
  if (!user.email) return { message: DELETE_UNAVAILABLE };

  switch (await verifyPassword(user.email, password)) {
    case "wrong":
      return { fieldErrors: { password: "That password isn’t right." } };
    case "rate_limited":
      return { message: "Too many attempts. Wait a few minutes, then try again." };
    case "unavailable":
      return { message: DELETE_UNAVAILABLE };
  }

  if (!(await deleteUserById(user.id))) {
    return { message: "Your account couldn’t be deleted right now. Nothing was removed. Try again in a little while." };
  }

  // The account is gone: drop this browser's session cookies too.
  const supabase = await createSupabaseClient(getSupabaseConfig()!);
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (name.startsWith("sb-")) cookieStore.delete(name);
  }
  redirect("/goodbye");
}

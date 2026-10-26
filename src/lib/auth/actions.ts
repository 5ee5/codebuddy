"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { canManageAccounts, createConfirmedUser, deleteUserById, verifyPassword } from "@/lib/auth/admin";
import { getSignupCode, getSupabaseConfig } from "@/lib/auth/config";
import { loginPathFor, safeNextPath } from "@/lib/auth/paths";
import { createSupabaseClient, getSignedInUser } from "@/lib/auth/server";
import {
  checkSignupCode,
  newAccountLimitReached,
  recordFailedCode,
  recordNewAccount,
  tooManyFailedCodes,
} from "@/lib/auth/signup";
import {
  hasFieldErrors,
  validateAccountDeletion,
  validateNewPassword,
  validateSignIn,
  validateSignUp,
  type AuthFormState,
} from "@/lib/auth/validation";

/*
 * Sign-up with a class code, sign-in, sign-out, password changes and account
 * deletion. Supabase's own error text never reaches the page; only its error
 * code is logged.
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

/**
 * The visitor's network address, for the wrong-code limit. On the live site
 * every request comes through Cloudflare, which sets `CF-Connecting-IP`.
 */
async function clientAddress(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const SIGNUP_CLOSED = "Sign-up isn’t open on this server. Ask the person running CodeBuddy for an account.";

/**
 * Creates an account for someone with the class code, then signs them in.
 * Public sign-up stays off in Supabase; the account is created here with the
 * secret key, so the class code can't be skipped.
 */
export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const classCode = String(formData.get("classCode") ?? "").trim();
  const fieldErrors = validateSignUp(email, password, confirm, classCode);
  if (hasFieldErrors(fieldErrors)) return { fieldErrors, email };

  const expected = getSignupCode();
  const config = getSupabaseConfig();
  if (!expected || !config || !canManageAccounts()) return { message: SIGNUP_CLOSED, email };

  const address = await clientAddress();
  if (tooManyFailedCodes(address)) {
    return { message: "Too many wrong class codes from your network. Wait an hour, then try again.", email };
  }
  if (!checkSignupCode(classCode, expected)) {
    recordFailedCode(address);
    return { fieldErrors: { classCode: "That class code isn’t right. Check it with your teacher." }, email };
  }
  if (newAccountLimitReached()) {
    return { message: "A lot of accounts were created in the last hour. Try again later.", email };
  }

  switch (await createConfirmedUser(email, password)) {
    case "exists":
      return { fieldErrors: { email: "There’s already an account with this email. Sign in instead." }, email };
    case "weak_password":
      return {
        fieldErrors: { password: "That password is too easy to guess. Choose a longer or less common one." },
        email,
      };
    case "unavailable":
      return { message: "Your account couldn’t be created right now. Try again in a little while.", email };
  }
  recordNewAccount();

  const next = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseClient(config);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // The account exists; the student can sign in by hand.
    logAuthFailure("sign-in-after-sign-up", error.code ?? error.status);
    redirect(loginPathFor(next));
  }
  redirect(next);
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
  if (!canManageAccounts()) {
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

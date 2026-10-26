"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Field } from "@/components/ui/field";
import { control, panel } from "@/components/ui/styles";
import { signIn } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/validation";

const INITIAL: AuthFormState = {};

/**
 * Email and password sign-in. The Server Action checks the fields again,
 * signs in with Supabase and redirects to `?next=` (same-site paths only).
 */
export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

  // After a failed attempt, move focus to the first field that needs fixing.
  useEffect(() => {
    const id = state.fieldErrors?.email ? "login-email" : state.fieldErrors?.password ? "login-password" : null;
    if (id) document.getElementById(id)?.focus();
  }, [state]);

  return (
    <form noValidate action={formAction} className={panel}>
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <Field id="login-email" label="Email" error={state.fieldErrors?.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              required
              defaultValue={state.email}
              className={`${control} min-h-11`}
            />
          )}
        </Field>
        <Field id="login-password" label="Password" error={state.fieldErrors?.password}>
          {(props) => (
            <input
              {...props}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className={`${control} min-h-11`}
            />
          )}
        </Field>
        <FormMessage message={state.message} ok={state.ok} />
      </div>
      <SubmitButton pending={pending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

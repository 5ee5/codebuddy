import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-form";
import { Icon } from "@/components/icons";
import { buttonSecondary, eyebrow, panel } from "@/components/ui/styles";
import { signOut } from "@/lib/auth/actions";
import { loginPathFor } from "@/lib/auth/paths";
import { getSignedInUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Account",
};

/** The signed-in email. The proxy already redirects signed-out visitors; this is the real check. */
async function SignedInAs() {
  const user = await getSignedInUser();
  if (!user) redirect(loginPathFor("/account"));
  return (
    <p className="mt-3 text-base leading-relaxed text-muted">
      Signed in as <strong className="font-semibold break-all text-ink">{user.email ?? "unknown email"}</strong>
    </p>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-4 md:py-12">
      <div>
        <p className={eyebrow}>Account</p>
        <h1 className="font-display mt-3 text-4xl font-semibold sm:text-5xl">Your account</h1>
        <Suspense fallback={<p className="mt-3 h-7" aria-hidden="true" />}>
          <SignedInAs />
        </Suspense>
      </div>
      <Link
        href="/history"
        className={`${panel} flex min-h-11 items-center gap-3 p-5 font-semibold transition-colors duration-150 hover:bg-surface-2`}
      >
        <Icon name="file" className="size-5 shrink-0" />
        <span className="grow">
          History
          <span className="block text-sm font-normal text-muted">Your saved Learn and Debug answers</span>
        </span>
        <Icon name="arrowRight" className="size-4 text-muted" />
      </Link>
      <PasswordForm />
      <form action={signOut}>
        <button type="submit" className={buttonSecondary}>
          <Icon name="signOut" className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

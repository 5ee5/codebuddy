import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { eyebrow, panel } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-4 md:py-12">
      <div>
        <p className={eyebrow}>Account</p>
        <h1 className="font-display mt-3 text-4xl font-semibold sm:text-5xl">Sign in</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Learn and Debug use a paid AI service, so they need an account. Ask the person running
          CodeBuddy to create one for you.{" "}
          <Link href="/practice" className="font-semibold text-ink underline underline-offset-4">
            Practice
          </Link>{" "}
          works without signing in.
        </p>
      </div>
      {/* The form reads `?next=` from the URL, which is only known at request time. */}
      <Suspense fallback={<div aria-hidden="true" className={`${panel} h-80`} />}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted">
        <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
          Privacy
        </Link>
        : what CodeBuddy stores about you and for how long.
      </p>
    </div>
  );
}

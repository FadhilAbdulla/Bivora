"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { acceptTerms } from "../actions";

function Done() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/onboarding/review"), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div role="status" className="step-in py-14 text-center">
      <svg viewBox="0 0 52 52" className="mx-auto size-20 text-brand" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle className="draw-ring" pathLength={1} cx="26" cy="26" r="23" />
        <path className="draw-check" pathLength={1} d="M15 27l8 8 14-16" />
      </svg>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Documents submitted</h2>
      <p className="mt-1 text-sm text-muted">Thank you. We&apos;ll review them now.</p>
    </div>
  );
}

export function TermsForm() {
  const [state, action] = useActionState(acceptTerms, null);
  if (state?.success) return <Done />;

  return (
    <form action={action} className="mt-4 space-y-3 pb-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 size-5 shrink-0 accent-brand" />
        I have read and agree to the Terms &amp; Conditions.
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm">
        <input type="checkbox" name="risk" className="mt-0.5 size-5 shrink-0 accent-brand" />
        I understand that trading carries a high level of risk and that I could lose more than my deposit.
      </label>
      <SubmitButton className="w-full py-3 text-base" pendingText="Submitting…">
        Agree and finish
      </SubmitButton>
      <Link href="/onboarding/proof-of-address" className="block py-2 text-center text-sm text-muted hover:text-foreground">
        Back
      </Link>
    </form>
  );
}

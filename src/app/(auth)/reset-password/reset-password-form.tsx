"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";
import { resetPassword } from "../actions";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action] = useActionState(resetPassword, null);

  return (
    <form action={action} className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password">
        <PasswordInput name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Repeat new password">
        <PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Save password
      </SubmitButton>
      <Link href="/forgot-password" className="block text-sm text-brand hover:underline">
        Need a new link?
      </Link>
    </form>
  );
}

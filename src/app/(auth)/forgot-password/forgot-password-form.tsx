"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.success) return <div className="mt-4"><Alert tone="success">{state.success}</Alert></div>;

  return (
    <form action={action} className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

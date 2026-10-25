"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { adminLogin } from "../auth-actions";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLogin, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Admin email">
        <Input name="email" type="email" autoComplete="username" required defaultValue={state?.values?.email} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in to console
      </SubmitButton>
    </form>
  );
}

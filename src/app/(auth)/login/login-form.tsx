"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { login } from "../actions";

export function LoginForm() {
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

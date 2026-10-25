"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { signup } from "../actions";

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  const v = state?.values ?? {};

  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="firstName" autoComplete="given-name" required defaultValue={v.firstName} />
        </Field>
        <Field label="Last name">
          <Input name="lastName" autoComplete="family-name" required defaultValue={v.lastName} />
        </Field>
      </div>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} />
        </Field>
        <Field label="Country">
          <Input name="country" autoComplete="country-name" defaultValue={v.country} />
        </Field>
      </div>
      <Field label="Password" hint="At least 8 characters, with a letter and a number.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 accent-brand" defaultChecked={v.terms === "on"} />
        I accept the terms of service and understand that trading leveraged products carries a high level of risk.
      </label>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

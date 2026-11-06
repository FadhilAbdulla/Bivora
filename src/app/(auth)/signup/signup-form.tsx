"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { PhoneInput } from "@/components/phone-input";
import { SubmitButton } from "@/components/submit-button";
import { signup } from "../actions";

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  const v = state?.values ?? {};

  return (
    <form action={action} className="mt-3 space-y-2.5 sm:mt-6 sm:space-y-4 [@media(max-height:600px)]:mt-2 [@media(max-height:600px)]:space-y-1">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
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
      <PhoneInput defaultValue={v.phone} required openUp />
      <Field label="Password" hint="8+ characters, with a letter and a number.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

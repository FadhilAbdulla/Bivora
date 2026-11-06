"use client";

import { useActionState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { savePhone } from "../actions";

export function PhoneForm() {
  const [state, action] = useActionState(savePhone, null);

  return (
    <form action={action} className="mt-4 space-y-4 pb-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <PhoneInput label="Mobile number" defaultValue={state?.values?.phone} required />
      <SubmitButton className="w-full py-3 text-base" pendingText="Saving…">
        Continue
      </SubmitButton>
    </form>
  );
}

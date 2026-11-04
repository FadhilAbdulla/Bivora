"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { sendContactMessage } from "./actions";

export function ContactForm() {
  const [state, action] = useActionState(sendContactMessage, null);
  const v = state?.values ?? {};

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Name">
        <Input name="name" required autoComplete="name" defaultValue={v.name} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" defaultValue={v.email} />
      </Field>
      <Field label="Message">
        <Textarea name="message" required rows={5} maxLength={2000} defaultValue={v.message} />
      </Field>
      {/* Hidden from people; catches spam bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <SubmitButton className="w-full py-3 text-base" pendingText="Sending…">
        Send message
      </SubmitButton>
    </form>
  );
}

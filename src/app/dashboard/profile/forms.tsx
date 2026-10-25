"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { changePassword, updateProfile } from "../actions";

type ProfileValues = { firstName: string; lastName: string; email: string; phone: string; country: string };

export function ProfileForm({ user }: { user: ProfileValues }) {
  const [state, action] = useActionState(updateProfile, null);
  const v = { ...user, ...state?.values };

  return (
    <form action={action} className="space-y-4 p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="firstName" required defaultValue={v.firstName} />
        </Field>
        <Field label="Last name">
          <Input name="lastName" required defaultValue={v.lastName} />
        </Field>
      </div>
      <Field label="Email" hint="Contact support to change your email.">
        <Input value={user.email} disabled readOnly />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input name="phone" type="tel" defaultValue={v.phone} />
        </Field>
        <Field label="Country">
          <Input name="country" defaultValue={v.country} />
        </Field>
      </div>
      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);

  return (
    <form action={action} className="space-y-4 p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Current password">
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password">
        <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}

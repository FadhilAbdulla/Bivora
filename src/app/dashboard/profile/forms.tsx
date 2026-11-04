"use client";

import { useActionState, useState } from "react";
import { Modal, ModalFooter } from "@/components/modal";
import { PhoneInput } from "@/components/phone-input";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { changePassword, updateProfile } from "../actions";

type ProfileValues = { firstName: string; lastName: string; email: string; phone: string; country: string };

/** Runs a server action and, when it succeeds, closes the modal with a confirmation. */
function useModalAction(action: (prev: FormState, data: FormData) => Promise<FormState>, onClose: () => void) {
  return useActionState(async (prev: FormState, data: FormData) => {
    const result = await action(prev, data);
    if (result?.success) {
      onClose();
      toast(result.success);
    }
    return result;
  }, null);
}

export function EditProfileButton({ user }: { user: ProfileValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit personal details">
        <ProfileForm user={user} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ProfileForm({ user, onClose }: { user: ProfileValues; onClose: () => void }) {
  const [state, action] = useModalAction(updateProfile, onClose);
  const v = { ...user, ...state?.values };

  return (
    <form action={action}>
      <div className="space-y-4 p-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input name="firstName" required autoComplete="given-name" defaultValue={v.firstName} />
          </Field>
          <Field label="Last name">
            <Input name="lastName" required autoComplete="family-name" defaultValue={v.lastName} />
          </Field>
        </div>
        <Field label="Email" hint="Contact support to change your email.">
          <Input value={user.email} disabled readOnly />
        </Field>
        <PhoneInput defaultValue={v.phone} />
        <Field label="Country">
          <Input name="country" autoComplete="country-name" defaultValue={v.country} />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </ModalFooter>
    </form>
  );
}

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Change password
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Change password">
        <PasswordForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function PasswordForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useModalAction(changePassword, onClose);

  return (
    <form action={action}>
      <div className="space-y-4 p-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" hint="At least 8 characters, with a letter and a number.">
          <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton pendingText="Updating…">Update password</SubmitButton>
      </ModalFooter>
    </form>
  );
}

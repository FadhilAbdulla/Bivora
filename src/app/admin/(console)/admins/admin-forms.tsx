"use client";

import { useActionState, useState } from "react";
import { Modal, ModalFooter } from "@/components/modal";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { changeAdminPassword, createAdmin, setUserStatus } from "../actions";

const PASSWORD_HINT = "At least 12 characters, with a letter and a number.";

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

export function AddAdminButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add admin</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add admin"
        description="They get full access. Share the password privately and ask them to change it."
      >
        <AddAdminForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function AddAdminForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useModalAction(createAdmin, onClose);
  const v = state?.values ?? {};

  return (
    <form action={action}>
      <div className="space-y-4 p-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input name="firstName" required autoComplete="off" defaultValue={v.firstName} />
          </Field>
          <Field label="Last name">
            <Input name="lastName" required autoComplete="off" defaultValue={v.lastName} />
          </Field>
        </div>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="off" defaultValue={v.email} />
        </Field>
        <Field label="Password" hint={PASSWORD_HINT}>
          <Input name="password" type="password" required minLength={12} autoComplete="new-password" />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton pendingText="Adding…">Add admin</SubmitButton>
      </ModalFooter>
    </form>
  );
}

export function ChangeAdminPasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Change my password
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Change my password">
        <ChangeAdminPasswordForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ChangeAdminPasswordForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useModalAction(changeAdminPassword, onClose);

  return (
    <form action={action}>
      <div className="space-y-4 p-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="Current password">
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" hint={PASSWORD_HINT}>
          <Input name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password">
          <Input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">Save password</SubmitButton>
      </ModalFooter>
    </form>
  );
}

export function AdminAccessButton({ id, name, active }: { id: string; name: string; active: boolean }) {
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={active ? "SUSPENDED" : "ACTIVE"} />
      <Button
        variant={active ? "danger" : "secondary"}
        onClick={(e) => {
          if (active && !confirm(`Deactivate ${name}? They'll lose access to the admin console straight away.`)) e.preventDefault();
        }}
      >
        {active ? "Deactivate" : "Reactivate"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Modal, ModalFooter } from "@/components/modal";
import { PhoneInput } from "@/components/phone-input";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { createClient } from "../actions";

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">Add client</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add client"
        description="Opens their Bivora account and their ARK trading account with the password you choose, and emails their trading login. Share the password with them privately."
      >
        <AddClientForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function AddClientForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await createClient(prev, data);
    if (result?.success) {
      onClose();
      toast(result.success);
    }
    return result;
  }, null);
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
        <PhoneInput label="Mobile number" defaultValue={v.phone} required openUp />
        <Field label="Password" hint="8+ characters, with a letter and a number. The same password is used for their trading account.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <SubmitButton pendingText="Adding…">Add client</SubmitButton>
      </ModalFooter>
    </form>
  );
}

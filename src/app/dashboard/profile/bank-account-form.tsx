"use client";

import { useActionState, useState } from "react";
import { Modal, ModalFooter } from "@/components/modal";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { addBankAccount, deleteBankAccount, setDefaultBankAccount } from "../actions";

export function AddBankAccountButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        Add account
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add bank account"
        description="Use an account in your own name. Withdrawals are paid here."
      >
        <BankAccountForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function BankAccountForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await addBankAccount(prev, data);
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
        <Field label="Bank name">
          <Input name="bankName" required defaultValue={v.bankName} placeholder="e.g. Emirates NBD" />
        </Field>
        <Field label="Account holder name">
          <Input name="accountHolder" required autoComplete="name" defaultValue={v.accountHolder} />
        </Field>
        <Field label="Account number">
          <Input name="accountNumber" required inputMode="numeric" defaultValue={v.accountNumber} />
        </Field>
        <Field label="IBAN (optional)">
          <Input name="iban" defaultValue={v.iban} placeholder="AE07 0331 2345 6789 0123 456" className="font-mono" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SWIFT / BIC">
            <Input name="swiftCode" defaultValue={v.swiftCode} className="font-mono" />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue={v.currency ?? "USD"}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch">
            <Input name="branch" defaultValue={v.branch} />
          </Field>
          <Field label="Country">
            <Input name="country" autoComplete="country-name" defaultValue={v.country} />
          </Field>
        </div>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">Save account</SubmitButton>
      </ModalFooter>
    </form>
  );
}

export function BankAccountActions({ id, name, isDefault }: { id: string; name: string; isDefault: boolean }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1 text-sm">
      {!isDefault && (
        <form
          action={async (data) => {
            await setDefaultBankAccount(data);
            toast("Default account updated.");
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button className="px-2 py-2 text-muted hover:text-foreground">Make default</button>
        </form>
      )}
      <button type="button" onClick={() => setConfirming(true)} className="px-2 py-2 text-muted hover:text-danger">
        Remove
      </button>
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Remove this account?" description={name}>
        <form
          action={async (data) => {
            await deleteBankAccount(data);
            setConfirming(false);
            toast("Bank account removed.");
          }}
        >
          <input type="hidden" name="id" value={id} />
          <p className="p-5 text-sm text-muted">You can add it again later. Past withdrawals aren&apos;t affected.</p>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              Keep account
            </Button>
            <SubmitButton variant="danger" pendingText="Removing…">
              Remove
            </SubmitButton>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

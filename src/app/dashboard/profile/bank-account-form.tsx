"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select } from "@/components/ui";
import { addBankAccount } from "../actions";

export function BankAccountForm() {
  const [state, action] = useActionState(addBankAccount, null);
  const v = state?.values ?? {};

  return (
    <form action={action} className="space-y-4 p-5">
      <p className="text-sm font-medium">Add bank account</p>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
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
      <SubmitButton className="w-full" pendingText="Saving…">
        Save bank account
      </SubmitButton>
    </form>
  );
}

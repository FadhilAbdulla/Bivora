"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { DEPOSIT_METHODS, MIN_DEPOSIT, PAYMENT_INSTRUCTIONS } from "@/lib/constants";
import { requestDeposit } from "../actions";

export function DepositForm() {
  const [state, action] = useActionState(requestDeposit, null);
  const [method, setMethod] = useState<string>(DEPOSIT_METHODS[0].value);
  const v = state?.values ?? {};

  return (
    <form action={action} className="space-y-4 p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Amount (USD)" hint={`Minimum deposit $${MIN_DEPOSIT}.`}>
        <Input name="amount" type="number" inputMode="decimal" min={MIN_DEPOSIT} step="0.01" required defaultValue={v.amount} />
      </Field>
      {DEPOSIT_METHODS.length > 1 ? (
        <Field label="Payment method">
          <Select name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {DEPOSIT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="method" value={method} />
      )}
      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
        <p className="mb-1 font-medium">{DEPOSIT_METHODS.length > 1 ? "Payment instructions" : "Pay by bank transfer"}</p>
        <ul className="space-y-0.5 text-muted">
          {PAYMENT_INSTRUCTIONS[method]?.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
      <Field label="Payment reference" hint="The reference from your bank transfer. Helps us match your payment faster.">
        <Input name="reference" maxLength={200} defaultValue={v.reference} />
      </Field>
      <Field label="Note (optional)">
        <Textarea name="userNote" maxLength={500} defaultValue={v.userNote} />
      </Field>
      <SubmitButton className="w-full" pendingText="Submitting…">
        Submit deposit request
      </SubmitButton>
    </form>
  );
}

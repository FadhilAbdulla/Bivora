"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { adjustUserBalance } from "../../actions";

export function AdjustBalanceForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adjustUserBalance, null);

  return (
    <form action={action} className="space-y-4 p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="userId" value={userId} />
      <Field label="Amount (USD)" hint="Use a negative number to debit.">
        <Input name="amount" type="number" step="0.01" required />
      </Field>
      <Field label="Reason">
        <Input name="reason" required maxLength={200} placeholder="e.g. Bonus credit, fee refund" />
      </Field>
      <SubmitButton variant="secondary" className="w-full" pendingText="Applying…">
        Apply adjustment
      </SubmitButton>
    </form>
  );
}

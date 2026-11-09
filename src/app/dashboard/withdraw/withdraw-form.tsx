"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { MIN_WITHDRAWAL, WITHDRAWAL_METHODS } from "@/lib/constants";
import { requestWithdrawal } from "../actions";

const MANUAL = "manual";

export function WithdrawForm({
  available,
  bankAccounts,
}: {
  available: string;
  bankAccounts: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(requestWithdrawal, null);
  const v = state?.values ?? {};
  const [method, setMethod] = useState<string>(v.method ?? WITHDRAWAL_METHODS[0].value);
  const [bankAccountId, setBankAccountId] = useState<string>(v.bankAccountId ?? bankAccounts[0]?.id ?? MANUAL);
  const usingSavedBank = method === "BANK_TRANSFER" && bankAccountId !== MANUAL;

  return (
    <form action={action} className="space-y-4 p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Amount (USD)" hint={`Available: $${available}.`}>
        <Input
          name="amount"
          type="number"
          inputMode="decimal"
          min={MIN_WITHDRAWAL}
          max={available}
          step="0.01"
          required
          defaultValue={v.amount}
        />
      </Field>
      {WITHDRAWAL_METHODS.length > 1 ? (
        <Field label="Payout method">
          <Select name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {WITHDRAWAL_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="method" value={method} />
      )}

      {method === "BANK_TRANSFER" && (
        <Field label="Bank account">
          <Select name="bankAccountId" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
            <option value={MANUAL}>Enter bank details manually</option>
          </Select>
          <span className="block text-xs text-muted">
            <Link href="/dashboard/profile#bank-accounts" className="text-brand hover:underline">
              Manage bank accounts
            </Link>
          </span>
        </Field>
      )}

      {!usingSavedBank && (
        <Field
          label="Payout details"
          hint={method === "BANK_TRANSFER" ? "Bank name, account holder, IBAN and SWIFT." : "Your wallet address."}
        >
          <Textarea name="payoutDetails" required maxLength={500} defaultValue={v.payoutDetails} />
        </Field>
      )}
      <Field label="Note (optional)">
        <Input name="userNote" maxLength={500} defaultValue={v.userNote} />
      </Field>
      <SubmitButton className="w-full" pendingText="Submitting…">
        Request withdrawal
      </SubmitButton>
    </form>
  );
}

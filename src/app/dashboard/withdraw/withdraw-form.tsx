"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { MIN_WITHDRAWAL, WITHDRAWAL_METHODS } from "@/lib/constants";
import { AddBankAccountButton } from "../profile/bank-account-form";
import { requestWithdrawal } from "../actions";

type Choice = { id: string; label: string };

export function WithdrawForm({
  tradingAccounts,
  bankAccounts,
  canAddBank,
}: {
  tradingAccounts: Choice[];
  bankAccounts: Choice[];
  canAddBank: boolean;
}) {
  // The submit button sits outside the form (see below), so it reads the pending state from here.
  const [state, action, pending] = useActionState(requestWithdrawal, null);
  const v = state?.values ?? {};
  const [bankAccountId, setBankAccountId] = useState<string>(v.bankAccountId ?? bankAccounts[0]?.id ?? "");
  // A bank account added just now comes in with the page refresh: choose it if nothing valid is chosen.
  const chosenBank = bankAccounts.some((a) => a.id === bankAccountId) ? bankAccountId : (bankAccounts[0]?.id ?? "");

  return (
    <div className="space-y-4 p-5">
      <form id="withdraw" action={action} className="space-y-4">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.success && <Alert tone="success">{state.success}</Alert>}
        <input type="hidden" name="method" value={WITHDRAWAL_METHODS[0].value} />

        {tradingAccounts.length > 1 ? (
          <Field label="Trading account">
            <Select name="tradingAccount" defaultValue={v.tradingAccount ?? tradingAccounts[0].id} required>
              {tradingAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Trading account</span>
            <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm">{tradingAccounts[0].label}</p>
            <input type="hidden" name="tradingAccount" value={tradingAccounts[0].id} />
          </div>
        )}

        <Field label="Amount (USD)">
          <Input name="amount" type="number" inputMode="decimal" min={MIN_WITHDRAWAL} step="0.01" required defaultValue={v.amount} />
        </Field>

        {bankAccounts.length > 0 ? (
          <Field label="Bank account">
            <Select name="bankAccountId" value={chosenBank} onChange={(e) => setBankAccountId(e.target.value)} required>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Bank account</span>
            <Alert tone="info">Add the bank account to pay this withdrawal into.</Alert>
          </div>
        )}

        <Field label="Note (optional)">
          <Textarea name="userNote" maxLength={500} defaultValue={v.userNote} />
        </Field>
      </form>

      {/* Outside the withdrawal form: the bank account pop-up has a form of its own. */}
      {canAddBank && (
        <AddBankAccountButton
          label={bankAccounts.length ? "Add another bank account" : "Add bank account"}
          variant={bankAccounts.length ? "ghost" : "secondary"}
          className={bankAccounts.length ? "-mt-2 px-0 text-brand hover:bg-transparent" : "w-full"}
        />
      )}

      <Button type="submit" form="withdraw" className="w-full" disabled={pending || bankAccounts.length === 0}>
        {pending ? "Submitting…" : "Request withdrawal"}
      </Button>
    </div>
  );
}

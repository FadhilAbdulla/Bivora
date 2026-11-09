"use client";

import { useActionState, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addArkMoney, retryArkMoney, type MoneyFormState } from "./actions";

const newKey = () => crypto.randomUUID().replace(/-/g, "");

/** Post credit in/out, an adjustment or a bonus to a client's ARK account. */
export function MoneyForm({ clients, types, firstKey }: { clients: { id: string; label: string }[]; types: Record<number, string>; firstKey: string }) {
  // One key per transaction: a double click sends the same key, which is recorded once.
  const [key, setKey] = useState(firstKey);
  const [state, action] = useActionState(async (prev: MoneyFormState, data: FormData) => {
    const result = await addArkMoney(prev, data);
    if (result?.success) toast(result.success);
    setKey(newKey());
    return result;
  }, null);
  const [type, setType] = useState(state?.values?.type ?? "");
  const v = state?.values ?? {};

  return (
    <form
      key={state?.values ? "kept" : key}
      action={action}
      onSubmit={(e) => {
        const f = new FormData(e.currentTarget);
        const client = clients.find((c) => c.id === f.get("userId"))?.label ?? "this client";
        const amount = String(f.get("amount") ?? "").trim();
        if (!confirm(`Post ${types[Number(f.get("type"))] ?? "this transaction"} of ${amount} to ${client} in ARK? They'll be emailed.`)) e.preventDefault();
      }}
      className="space-y-4 p-4 sm:p-5"
    >
      <input type="hidden" name="key" value={key} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.warning && <Alert tone="info">{state.warning}</Alert>}
      {clients.length === 0 ? (
        <Alert tone="info">No client has an ARK account yet. Approve a client first.</Alert>
      ) : (
        <>
          <Field label="Client">
            <Select name="userId" required defaultValue={v.userId ?? ""}>
              <option value="" disabled>Choose a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select name="type" required defaultValue={v.type ?? ""} onChange={(e) => setType(e.target.value)}>
                <option value="" disabled>Choose…</option>
                {Object.entries(types).map(([value, name]) => (
                  <option key={value} value={value}>{name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount" hint={type === "5" ? "Use a minus sign to deduct, e.g. -250." : undefined}>
              <Input name="amount" inputMode="decimal" required autoComplete="off" placeholder="0.00" defaultValue={v.amount} />
            </Field>
          </div>
          <Field label="Note" hint="Optional. Shown to the client in their email and saved in ARK.">
            <Input name="note" maxLength={200} autoComplete="off" defaultValue={v.note} />
          </Field>
          <SubmitButton pendingText="Posting to ARK…">Post transaction</SubmitButton>
        </>
      )}
    </form>
  );
}

export function RetryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      className="px-2.5 py-1 text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryArkMoney(id);
          if (r.error) toast(r.error);
          else toast(r.success ?? r.warning ?? "Sent.");
        })
      }
    >
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}

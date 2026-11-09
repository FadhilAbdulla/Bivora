"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ClientPicker, type PickerClient } from "@/components/client-picker";
import { Modal } from "@/components/modal";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addArkMoney, retryArkMoney, type MoneyFormState } from "./actions";

const newKey = () => crypto.randomUUID().replace(/-/g, "");

/** Post a deposit, withdrawal, credit, adjustment or bonus to a client's ARK account. */
type MoneyFormProps = { clients: PickerClient[]; types: Record<number, string>; firstKey: string; defaultClient?: string };

/** The button on Money flow: the form opens in a pop-up (already open when coming from a client's page). */
export function AddMoneyButton(props: MoneyFormProps) {
  const [open, setOpen] = useState(Boolean(props.defaultClient));
  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">Add money transaction</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New money transaction"
        description="Goes straight to the client's ARK account, and the client is emailed. It doesn't change their Bivora wallet."
      >
        <MoneyForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function MoneyForm({ clients, types, firstKey, defaultClient, onDone }: MoneyFormProps & { onDone?: () => void }) {
  // One key per transaction: a double click sends the same key, which is recorded once.
  const [key, setKey] = useState(firstKey);
  const [state, action] = useActionState(async (prev: MoneyFormState, data: FormData) => {
    const result = await addArkMoney(prev, data);
    if (result?.success) {
      toast(result.success);
      onDone?.();
    }
    setKey(newKey());
    return result;
  }, null);
  const [type, setType] = useState(state?.values?.type ?? "");
  // With the client already chosen (from their page), start at Type. The pop-up focuses its first
  // field as it opens, so this runs just after.
  const typeSelect = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!defaultClient) return;
    const timer = setTimeout(() => typeSelect.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [defaultClient]);
  const v = state?.values ?? {};

  return (
    <form
      key={state?.values ? "kept" : key}
      action={action}
      onSubmit={(e) => {
        const f = new FormData(e.currentTarget);
        const picked = clients.find((c) => c.id === f.get("userId"));
        const client = picked ? `${picked.name} (${picked.detail})` : "this client";
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
            <ClientPicker name="userId" clients={clients} defaultValue={v.userId ?? defaultClient} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select ref={typeSelect} name="type" required defaultValue={v.type ?? ""} onChange={(e) => setType(e.target.value)}>
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

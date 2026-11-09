"use client";

import { useActionState, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { ArkChoice } from "@/lib/ark/reports";
import type { FormState } from "@/lib/form";
import { saveArkSettings, testArkConnection } from "./actions";

export type ArkFormValues = {
  apiUrl: string;
  companyName: string;
  dealerUsername: string;
  parentId: number;
  genericPolicyId: number;
  currenciesPolicyId: number;
  tradingUrl: string;
};

/** A list from ARK, or why it couldn't be loaded (the field then takes a typed ID). */
export type ChoiceList = { data: ArkChoice[]; error?: undefined } | { data?: undefined; error: string };
export type ArkFormChoices = { offices: ChoiceList; genericPolicies: ChoiceList; scriptPolicies: ChoiceList } | { error: string } | null;

export function ArkSettingsForm({ saved, choices }: { saved: ArkFormValues | null; choices: ArkFormChoices }) {
  const [state, action] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await saveArkSettings(prev, data);
    if (result?.success) toast(result.success);
    return result;
  }, null);
  const [test, setTest] = useState<FormState>(null);
  const [testing, startTest] = useTransition();
  const v: Record<string, string | number | undefined> = { ...saved, ...state?.values };

  return (
    <form action={action} className="space-y-4 p-4 sm:p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Gateway URL" hint="From your broker, e.g. https://yourbroker.arktrader.io/api/apigateway">
        <Input name="apiUrl" type="url" required autoComplete="off" defaultValue={v.apiUrl} />
      </Field>
      <Field label="Company name" hint="Exactly as your broker gave it.">
        <Input name="companyName" required autoComplete="off" defaultValue={v.companyName} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dealer username">
          <Input name="dealerUsername" required autoComplete="off" defaultValue={v.dealerUsername} />
        </Field>
        <Field label="Dealer password" hint={saved ? "Saved and hidden. Leave blank to keep it." : "Stored encrypted."}>
          <Input name="dealerPassword" type="password" required={!saved} autoComplete="new-password" placeholder={saved ? "••••••••" : undefined} />
        </Field>
      </div>
      {!saved ? (
        <Alert tone="info">Save the connection first. The office and policies can then be picked from ARK&apos;s lists.</Alert>
      ) : choices && "error" in choices ? (
        <Alert tone="error">Couldn&apos;t load the lists from ARK: {choices.error} Enter the IDs instead, or fix the connection and reload.</Alert>
      ) : null}
      <ChoiceField
        name="parentId"
        label="Office"
        idLabel="Office ID"
        hint="Where new clients are created."
        value={v.parentId}
        list={choices && !("error" in choices) ? choices.offices : null}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChoiceField
          name="genericPolicyId"
          label="Generic policy"
          idLabel="Generic policy ID"
          value={v.genericPolicyId}
          list={choices && !("error" in choices) ? choices.genericPolicies : null}
        />
        <ChoiceField
          name="currenciesPolicyId"
          label="Script policy"
          idLabel="Script policy ID"
          value={v.currenciesPolicyId}
          list={choices && !("error" in choices) ? choices.scriptPolicies : null}
        />
      </div>
      <Field label="Trading login URL" hint="Where clients log in to trade. It goes in their login email.">
        <Input name="tradingUrl" type="url" required autoComplete="off" defaultValue={v.tradingUrl} />
      </Field>

      {test?.error && <Alert tone="error">{test.error}</Alert>}
      {test?.success && <Alert tone="success">{test.success}</Alert>}
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        {saved && (
          <Button
            type="button"
            variant="secondary"
            disabled={testing}
            onClick={() => startTest(async () => setTest(await testArkConnection()))}
          >
            {testing ? "Testing…" : "Test connection"}
          </Button>
        )}
      </div>
      {saved && <p className="text-xs text-muted">Test connection uses the saved settings, so save any changes first.</p>}
    </form>
  );
}

function ChoiceField({ name, label, idLabel, hint, value, list }: {
  name: string;
  label: string;
  idLabel: string;
  hint?: string;
  value: string | number | undefined;
  list: ChoiceList | null;
}) {
  if (!list?.data) {
    return (
      <Field label={idLabel} hint={list?.error ? `Couldn't load from ARK: ${list.error}` : hint}>
        <Input name={name} inputMode="numeric" required autoComplete="off" defaultValue={value} />
      </Field>
    );
  }
  const current = value === undefined || value === "" ? undefined : Number(value);
  const missing = current !== undefined && !list.data.some((c) => c.id === current);
  const groups = [...new Set(list.data.map((c) => c.group ?? ""))];
  const option = (c: ArkChoice) => (
    <option key={c.id} value={c.id}>{c.label} (ID {c.id})</option>
  );
  return (
    <Field label={label} hint={hint}>
      <Select name={name} required defaultValue={current ?? ""}>
        {current === undefined && <option value="" disabled>Choose…</option>}
        {missing && <option value={current}>ID {current} (not in ARK&apos;s list)</option>}
        {groups.length > 1 || groups[0]
          ? groups.map((g) => (
              <optgroup key={g} label={g || "Other"}>
                {list.data.filter((c) => (c.group ?? "") === g).map(option)}
              </optgroup>
            ))
          : list.data.map(option)}
      </Select>
    </Field>
  );
}

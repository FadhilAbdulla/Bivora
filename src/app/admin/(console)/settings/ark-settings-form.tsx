"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { saveArkSettings, saveOfficeFromUsername, testArkConnection } from "./actions";

export type ArkFormValues = {
  apiUrl: string;
  companyName: string;
  dealerUsername: string;
  parentId: number;
  genericPolicyId: number;
  currenciesPolicyId: number;
  tradingUrl: string;
};

export function ArkSettingsForm({ saved }: { saved: ArkFormValues | null }) {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Office ID" hint="Where new clients are created. See ARK accounts for every office ID.">
          <Input name="parentId" inputMode="numeric" required autoComplete="off" defaultValue={v.parentId} />
        </Field>
        <Field label="Generic policy ID">
          <Input name="genericPolicyId" inputMode="numeric" required autoComplete="off" defaultValue={v.genericPolicyId} />
        </Field>
        <Field label="Script policy ID">
          <Input name="currenciesPolicyId" inputMode="numeric" required autoComplete="off" defaultValue={v.currenciesPolicyId} />
        </Field>
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

/** TEMPORARY: sets the office ID from the office's ARK username. Remove once the ID is set. */
export function OfficeLookup() {
  const [state, action] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await saveOfficeFromUsername(prev, data);
    if (result?.success) toast(result.success);
    return result;
  }, null);

  return (
    <form action={action} className="space-y-3 p-4 sm:p-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && (
        <Alert tone="success">
          {state.success}{" "}
          {state.values?.officeId && (
            <Link href={`/admin/ark?node=${state.values.officeId}`} className="font-medium underline">
              See this office&apos;s users
            </Link>
          )}
        </Alert>
      )}
      <Field label="Office username in ARK">
        <Input name="officeUsername" required autoComplete="off" defaultValue="RealAppUser" />
      </Field>
      <SubmitButton pendingText="Looking up…">Find and save office ID</SubmitButton>
    </form>
  );
}


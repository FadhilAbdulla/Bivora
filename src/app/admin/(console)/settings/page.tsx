import type { Metadata } from "next";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { hasEncryptionKey } from "@/lib/secrets";
import { getArkChoices } from "@/lib/ark/reports";
import { ArkSettingsForm } from "./ark-settings-form";

export const metadata: Metadata = { title: "ARK settings" };

export default async function ArkSettingsPage() {
  await requireAdmin();
  const [settings, changes] = await Promise.all([
    db.arkSettings.findUnique({ where: { id: "ark" } }),
    db.arkSettingsChange.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  // Lists for the office and policy dropdowns, once there is a connection to ask.
  const choices = settings ? await getArkChoices() : null;
  // The password stays on the server: only the fields the form may show are passed to it.
  const saved = settings && {
    apiUrl: settings.apiUrl,
    companyName: settings.companyName,
    dealerUsername: settings.dealerUsername,
    parentId: settings.parentId,
    genericPolicyId: settings.genericPolicyId,
    currenciesPolicyId: settings.currenciesPolicyId,
    tradingUrl: settings.tradingUrl,
  };

  return (
    <>
      <PageHeader title="ARK settings" description="How Bivora connects to ARK. Changes apply straight away, with no redeploy." />
      {!hasEncryptionKey() && (
        <div className="mb-4">
          <Alert tone="error">SETTINGS_ENCRYPTION_KEY is missing or invalid, so the dealer password can&apos;t be saved or used. Add it to Vercel and your local .env.</Alert>
        </div>
      )}
      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader title="Connection" description="Get these details from your broker." />
          <ArkSettingsForm saved={saved} choices={choices} />
        </Card>
        <Card>
          <CardHeader title="Change history" description="Who changed what. Values are not recorded." />
          {changes.length === 0 ? (
            <EmptyState title="No changes yet." />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {changes.map((c) => (
                <li key={c.id} className="px-4 py-3 sm:px-5">
                  <p className="font-medium">{c.fields}</p>
                  <p className="mt-0.5 break-words text-xs text-muted">{c.adminEmail} · {formatDate(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

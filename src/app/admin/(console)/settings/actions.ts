"use server";

import { refresh } from "next/cache";
import { clearArkCache } from "@/lib/ark/cache";
import { z } from "zod";
import { ARK_USER_CURRENCY_ID, ArkError, connectArk, forgetArkSession, loadArkConfig } from "@/lib/ark/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";
import { SecretKeyError, encryptSecret } from "@/lib/secrets";

const httpsUrl = (label: string) =>
  z.url(`Enter a valid ${label}.`).trim().startsWith("https://", `The ${label} must start with https://.`);
const positiveId = (label: string) => z.coerce.number({ error: `Enter the ${label}.` }).int(`Enter the ${label}.`).positive(`Enter the ${label}.`);

const schema = z.object({
  apiUrl: httpsUrl("gateway URL"),
  companyName: z.string().trim().min(1, "Enter the company name.").max(200),
  dealerUsername: z.string().trim().min(1, "Enter the dealer username.").max(200),
  dealerPassword: z.string().max(500),
  parentId: positiveId("office"),
  genericPolicyId: positiveId("generic policy"),
  currenciesPolicyId: positiveId("script policy"),
  tradingUrl: httpsUrl("trading login URL"),
});

const LABELS: Record<string, string> = {
  apiUrl: "Gateway URL",
  companyName: "Company name",
  dealerUsername: "Dealer username",
  parentId: "Office ID",
  genericPolicyId: "Generic policy ID",
  currenciesPolicyId: "Script policy ID",
  tradingUrl: "Trading login URL",
};

export async function saveArkSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData, ["dealerPassword"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { dealerPassword, ...data } = parsed.data;
  const saved = await db.arkSettings.findUnique({ where: { id: "ark" } });
  // A blank password keeps the saved one, because the page never shows it.
  if (!saved && !dealerPassword) return { error: "Enter the dealer password.", values };

  let dealerPasswordEnc = saved?.dealerPasswordEnc;
  if (dealerPassword) {
    try {
      dealerPasswordEnc = encryptSecret(dealerPassword);
    } catch (e) {
      if (e instanceof SecretKeyError) return { error: e.message, values };
      throw e;
    }
  }

  const changed = Object.entries(data)
    .filter(([key, value]) => !saved || saved[key as keyof typeof data] !== value)
    .map(([key]) => LABELS[key]);
  if (dealerPassword) changed.push("Dealer password");
  if (changed.length === 0) return { success: "Nothing to save." };

  await db.$transaction([
    db.arkSettings.upsert({
      where: { id: "ark" },
      // Not a setting any more, but the column stays so no migration is needed.
      create: { ...data, currencyId: ARK_USER_CURRENCY_ID, dealerPasswordEnc: dealerPasswordEnc! },
      update: {
        ...data,
        currencyId: ARK_USER_CURRENCY_ID,
        dealerPasswordEnc: dealerPasswordEnc!,
        // New details mean a new session; the old one simply expires on ARK.
        sessionTokenEnc: null,
        sessionUsedAt: null,
        sessionLoginAt: null,
      },
    }),
    db.arkSettingsChange.create({ data: { adminEmail: admin.email, fields: changed.join(", ") } }),
  ]);
  forgetArkSession();
  // New details may mean a different office or policies: fetch ARK's lists again.
  await clearArkCache();
  refresh();
  return { success: "ARK settings saved." };
}

export async function testArkConnection(): Promise<FormState> {
  await requireAdmin();
  try {
    await connectArk(await loadArkConfig());
    return { success: "Connected. ARK accepted the dealer login." };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
}

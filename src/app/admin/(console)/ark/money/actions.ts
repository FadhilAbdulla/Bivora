"use server";

import { refresh } from "next/cache";
import { postManualMoney, retryManualMoney, type MoneyResult } from "@/lib/ark-money";
import { requireAdmin } from "@/lib/auth";
import { formValues } from "@/lib/form";

export type MoneyFormState = (MoneyResult & { values?: Record<string, string> }) | null;

export async function addArkMoney(_prev: MoneyFormState, formData: FormData): Promise<MoneyFormState> {
  const admin = await requireAdmin();
  const result = await postManualMoney({
    key: String(formData.get("key") ?? ""),
    adminId: admin.id,
    userId: String(formData.get("userId") ?? ""),
    type: Number(formData.get("type")),
    amount: String(formData.get("amount") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  refresh();
  // Keep what was typed when it didn't go through, so it can be fixed and sent again.
  return result.error && !result.recorded ? { ...result, values: formValues(formData, ["key"]) } : result;
}

export async function retryArkMoney(id: string): Promise<MoneyResult> {
  await requireAdmin();
  const result = await retryManualMoney(id);
  refresh();
  return result;
}

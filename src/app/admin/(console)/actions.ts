"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form";
import { FundError, adjustBalance, approveFundRequest, rejectFundRequest } from "@/lib/funds";

const reviewSchema = z.object({
  id: z.string().min(1),
  adminNote: z.string().trim().max(500).optional(),
});

async function review(
  formData: FormData,
  fn: typeof approveFundRequest,
  success: string,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  try {
    await fn(parsed.data.id, admin.id, parsed.data.adminNote);
  } catch (e) {
    if (e instanceof FundError) return { error: e.message };
    throw e;
  }
  refresh();
  return { success };
}

export async function approveRequest(_prev: FormState, formData: FormData) {
  return review(formData, approveFundRequest, "Approved.");
}

export async function rejectRequest(_prev: FormState, formData: FormData) {
  return review(formData, rejectFundRequest, "Rejected.");
}

export async function setUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  if (id === admin.id) return;

  await db.user.update({ where: { id }, data: { status } });
  refresh();
}

const adjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce
    .number({ error: "Enter a valid amount." })
    .refine((n) => n !== 0, "Amount can't be zero.")
    .refine((n) => Math.abs(n) <= 1_000_000, "Amount is too large."),
  reason: z.string().trim().min(3, "Enter a reason for the adjustment.").max(200),
});

export async function adjustUserBalance(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await adjustBalance({ ...parsed.data, adminId: admin.id });
  } catch (e) {
    if (e instanceof FundError) return { error: e.message };
    throw e;
  }
  refresh();
  return { success: "Balance adjusted." };
}

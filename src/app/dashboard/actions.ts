"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { MAX_BANK_ACCOUNTS, formatBankAccount } from "@/lib/bank";
import {
  DEPOSIT_METHODS,
  MAX_REQUEST_AMOUNT,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  WITHDRAWAL_METHODS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";
import { FundError, cancelFundRequest, createFundRequest } from "@/lib/funds";
import { isKycApproved } from "@/lib/kyc";
import { MAX_PASSWORD, checkPassword, hashPassword, strongPassword } from "@/lib/passwords";
import { MINUTE, TOO_MANY, hit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

const amount = (min: number) =>
  z.coerce
    .number({ error: "Enter a valid amount." })
    .min(min, `The minimum amount is $${min}.`)
    .max(MAX_REQUEST_AMOUNT, "Amount is too large.")
    .refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
      message: "Use at most two decimal places.",
    });

const methodValues = <T extends readonly { value: string }[]>(methods: T) =>
  methods.map((m) => m.value) as [string, ...string[]];

const depositSchema = z.object({
  amount: amount(MIN_DEPOSIT),
  method: z.enum(methodValues(DEPOSIT_METHODS), { error: "Choose a payment method." }),
  reference: z.string().trim().max(200).optional(),
  userNote: z.string().trim().max(500).optional(),
});

const withdrawalSchema = z.object({
  amount: amount(MIN_WITHDRAWAL),
  method: z.enum(methodValues(WITHDRAWAL_METHODS), { error: "Choose a payout method." }),
  bankAccountId: z.string().optional(),
  payoutDetails: z.string().trim().max(500).optional(),
  userNote: z.string().trim().max(500).optional(),
});

const NOT_APPROVED = "Deposits and withdrawals open once your documents are approved.";

export async function requestDeposit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  if (!isKycApproved(user.kycStatus)) return { error: NOT_APPROVED, values };
  const parsed = depositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  await createFundRequest({ userId: user.id, type: "DEPOSIT", ...parsed.data });
  refresh();
  return { success: "Deposit request submitted. We'll notify you once it's reviewed." };
}

export async function requestWithdrawal(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  if (!isKycApproved(user.kycStatus)) return { error: NOT_APPROVED, values };
  const parsed = withdrawalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { bankAccountId, ...data } = parsed.data;

  // A saved bank account is resolved server-side so the payout destination
  // always comes from the client's own stored details.
  if (data.method === "BANK_TRANSFER" && bankAccountId && bankAccountId !== "manual") {
    const account = await db.bankAccount.findFirst({ where: { id: bankAccountId, userId: user.id } });
    if (!account) return { error: "Choose one of your saved bank accounts.", values };
    data.payoutDetails = formatBankAccount(account);
  }
  if (!data.payoutDetails || data.payoutDetails.length < 5) {
    return { error: "Enter your payout details.", values };
  }

  try {
    await createFundRequest({ userId: user.id, type: "WITHDRAWAL", ...data });
  } catch (e) {
    if (e instanceof FundError) return { error: e.message, values };
    throw e;
  }
  refresh();
  return { success: "Withdrawal request submitted for review." };
}

export async function cancelRequest(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    await cancelFundRequest(user.id, id);
  } catch (e) {
    if (!(e instanceof FundError)) throw e;
  }
  refresh();
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60),
  phone: z.string().trim().regex(/^(\+[1-9]\d{6,14})?$/, "Enter a valid phone number.").optional(),
  country: z.string().trim().max(60).optional(),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: formValues(formData) };

  await db.user.update({
    where: { id: user.id },
    data: {
      ...parsed.data,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
    },
  });
  refresh();
  return { success: "Profile updated." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(MAX_PASSWORD, "Current password is incorrect."),
    newPassword: strongPassword(8, "New password"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "New passwords don't match." });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await hit("password-change", user.id, 5, 15 * MINUTE))) return { error: TOO_MANY };
  if (!(await checkPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  // Signs out every other device; this one gets a fresh session.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), sessionVersion: { increment: 1 } },
  });
  await createSession("client", updated);
  return { success: "Password changed. Other devices have been signed out." };
}

const bankAccountSchema = z
  .object({
    bankName: z.string().trim().min(2, "Enter the bank name.").max(100),
    accountHolder: z.string().trim().min(2, "Enter the account holder's name.").max(100),
    accountNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[A-Za-z0-9-]{4,34}$/, "Enter a valid account number.")),
    iban: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .pipe(z.string().regex(/^([A-Z]{2}[0-9]{2}[A-Z0-9]{10,30})?$/, "Enter a valid IBAN.")),
    swiftCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^([A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)?$/, "Enter a valid SWIFT / BIC code.")),
    branch: z.string().trim().max(100),
    country: z.string().trim().max(60),
    currency: z.enum(["USD", "EUR", "GBP", "AED"], { error: "Choose a currency." }),
  });

export async function addBankAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = bankAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const count = await db.bankAccount.count({ where: { userId: user.id } });
  if (count >= MAX_BANK_ACCOUNTS) {
    return { error: `You can save up to ${MAX_BANK_ACCOUNTS} bank accounts.`, values };
  }

  const d = parsed.data;
  await db.bankAccount.create({
    data: {
      ...d,
      userId: user.id,
      iban: d.iban || null,
      swiftCode: d.swiftCode || null,
      branch: d.branch || null,
      country: d.country || null,
      isDefault: count === 0,
    },
  });
  refresh();
  return { success: "Bank account saved." };
}

export async function setDefaultBankAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.$transaction([
    db.bankAccount.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.bankAccount.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } }),
  ]);
  refresh();
}

export async function deleteBankAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.$transaction(async (tx) => {
    const account = await tx.bankAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return;
    await tx.bankAccount.delete({ where: { id } });
    if (account.isDefault) {
      const next = await tx.bankAccount.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      if (next) await tx.bankAccount.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  refresh();
}

"use server";

import { refresh } from "next/cache";
import { clearArkCache } from "@/lib/ark/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/brand";
import { countryByIso, parsePhone } from "@/lib/countries";
import { missingEmailSettings, sendAccountOpened, sendLater } from "@/lib/email";
import { SecretKeyError, encryptSecret } from "@/lib/secrets";
import { approveClient, resendCredentials } from "@/lib/client-approval";
import { ArkError, loadArkConfig, setArkDemo } from "@/lib/ark/client";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";
import { FundError, adjustBalance, approveFundRequest, rejectFundRequest } from "@/lib/funds";
import { MAX_PASSWORD, checkPassword, hashPassword, strongPassword } from "@/lib/passwords";
import { MINUTE, TOO_MANY, hit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

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

  // Suspending ends the account's sessions straight away.
  await db.user.update({
    where: { id },
    data: { status, ...(status === "SUSPENDED" && { sessionVersion: { increment: 1 } }) },
  });
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

const kycSchema = z.object({
  userId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewKyc(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = kycSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const { userId, decision, note } = parsed.data;

  if (decision === "APPROVED") {
    const { error, warning } = await approveClient(userId);
    // A new ARK account: show it on ARK accounts straight away.
    await clearArkCache();
    if (error) return { error };
    refresh();
    return warning ? { error: warning } : { success: "Approved. Login details sent to the client." };
  }

  if (!note) return { error: "Enter a reason so the client knows what to fix." };
  const { count } = await db.user.updateMany({
    where: { id: userId, kycStatus: "PENDING" },
    data: { kycStatus: "REJECTED", kycNote: note, kycReviewedAt: new Date() },
  });
  if (count === 0) return { error: "These documents have already been reviewed." };
  refresh();
  return { success: "Saved." };
}

export async function resendArkCredentials(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { error, warning } = await resendCredentials(String(formData.get("userId") ?? ""));
  if (error || warning) return { error: error ?? warning };
  refresh();
  return { success: "New login details sent." };
}

const adminPassword = strongPassword(12);

const newClientSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(60),
  lastName: z.string().trim().min(1, "Enter a last name.").max(60),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number."),
  password: strongPassword(8, "The password"),
});

/**
 * Opens a client account with a password the admin chooses. The same password signs them in to
 * Bivora now and is given to their ARK account when they're approved (kept encrypted until then).
 */
export async function createClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData, ["password"]);
  const parsed = newClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  if (!(await hit("admin-create-client", admin.id, 30, 60 * MINUTE))) return { error: TOO_MANY, values };

  const { password, ...data } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: existing.role === "USER" ? "A client with this email already exists." : "An admin uses this email. Use a different email.", values };
  }
  let arkPasswordEnc: string;
  try {
    arkPasswordEnc = encryptSecret(password);
  } catch (e) {
    if (e instanceof SecretKeyError) return { error: e.message, values };
    throw e;
  }

  const user = await db.user.create({
    data: { ...data, country: countryByIso(parsePhone(data.phone).iso).name, passwordHash: await hashPassword(password), arkPasswordEnc },
  });
  refresh();
  if (!missingEmailSettings().length) {
    sendLater("Account opened", () => sendAccountOpened({ email: user.email, firstName: user.firstName, url: `${siteUrl}/login` }));
  }
  return { success: `${user.firstName}'s account is ready. Share the password with them privately; add their documents on their page.` };
}

const newAdminSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(60),
  lastName: z.string().trim().min(1, "Enter a last name.").max(60),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: adminPassword,
});

export async function createAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData, ["password"]);
  const parsed = newAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { password, ...data } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return {
      error: existing.role === "SUPER_ADMIN" ? "This email is already an admin." : "A client account already uses this email. Use a different email.",
      values,
    };
  }

  await db.user.create({ data: { ...data, role: "SUPER_ADMIN", passwordHash: await hashPassword(password) } });
  refresh();
  return { success: `${data.firstName} can now sign in at /admin/login.` };
}

const adminPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(MAX_PASSWORD, "Current password is incorrect."),
    newPassword: adminPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "New passwords don't match." });

export async function changeAdminPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adminPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await hit("admin-password-change", admin.id, 5, 15 * MINUTE))) return { error: TOO_MANY };
  if (!(await checkPassword(parsed.data.currentPassword, admin.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  const updated = await db.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), sessionVersion: { increment: 1 } },
  });
  await createSession("admin", updated);
  return { success: "Password changed. Other devices have been signed out." };
}

/** Switches a client's ARK account between real and demo. */
export async function setClientDemo(formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  const demo = formData.get("demo") === "1";
  const user = await db.user.findFirst({ where: { id, role: "USER", arkUserId: { not: null } }, select: { id: true, arkUserId: true } });
  if (!user?.arkUserId) return { error: "This client has no ARK account yet." };
  try {
    await setArkDemo(await loadArkConfig(), user.arkUserId, demo);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  await db.user.update({ where: { id: user.id }, data: { arkIsDemo: demo } });
  await clearArkCache();
  refresh();
  return { success: demo ? "Switched to a demo account." : "Switched to a real account." };
}

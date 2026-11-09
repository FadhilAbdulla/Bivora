"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/lib/brand";
import { db } from "@/lib/db";
import { missingEmailSettings, sendLater, sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { RESET_COOLDOWN_MS, matchesPassword, readResetToken, signResetToken } from "@/lib/password-reset";
import { createSession, deleteSession } from "@/lib/session";
import { formValues, type FormState } from "@/lib/form";
import { MAX_PASSWORD, checkPassword, hashPassword, strongPassword } from "@/lib/passwords";
import { MINUTE, TOO_MANY, clientIp, hit, isLimited, reset } from "@/lib/rate-limit";

const newPassword = strongPassword();

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number."),
  password: newPassword,
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  if (!(await hit("signup-ip", await clientIp(), 10, 60 * MINUTE))) return { error: TOO_MANY, values };

  const { password, ...data } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "An account with this email already exists.", values };

  const user = await db.user.create({
    data: {
      ...data,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession("client", user);
  sendLater("Welcome", () => sendWelcomeEmail(user));
  redirect("/onboarding");
}

const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password.").max(MAX_PASSWORD, "Incorrect email or password."),
});

// The proxy sends unauthenticated visitors to /login?next=<path>; the form
// posts back to that URL, so the referer carries the return path.
async function returnPath() {
  const referer = (await headers()).get("referer");
  if (!referer) return null;
  const next = new URL(referer).searchParams.get("next");
  if (!next?.startsWith("/")) return null;
  // Resolve it the way a browser would, so "/\\evil.com" and similar can't leave the site.
  const base = "https://bivora.invalid";
  const url = new URL(next, base);
  return url.origin === base ? `${url.pathname}${url.search}` : null;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { email, password } = parsed.data;
  // 5 wrong passwords lock an email for 15 minutes; one address can't try more than 30 times.
  if (!(await hit("login-ip", await clientIp(), 30, 15 * MINUTE)) || (await isLimited("login-email", email, 5, 15 * MINUTE))) {
    return { error: TOO_MANY, values };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user?.role === "USER" && !user.passwordHash) {
    return {
      error: "You signed up with Google and haven't saved a password. Use Forgot password to set one, or sign in with Google.",
      values,
    };
  }
  const valid = await checkPassword(password, user?.passwordHash);
  // Super admins sign in through /admin/login only.
  if (!user || !valid || user.role !== "USER") {
    await hit("login-email", email, 5, 15 * MINUTE);
    return { error: "Incorrect email or password.", values };
  }
  if (user.status !== "ACTIVE") {
    return { error: "Your account is suspended. Please contact support.", values };
  }

  await reset("login-email", email);
  await createSession("client", user);
  redirect((await returnPath()) ?? "/dashboard");
}

const NOT_SENT = "Password reset isn't available right now. Please contact support@bivoramarkets.com.";

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = z.email("Enter a valid email address.").trim().toLowerCase().safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  if (missingEmailSettings().length) return { error: NOT_SENT, values };
  if (!(await hit("reset-request-ip", await clientIp(), 10, 60 * MINUTE))) return { error: TOO_MANY, values };

  // One email per account every couple of minutes, so nobody can flood someone's inbox.
  const user = await db.user.findFirst({ where: { email: parsed.data, role: "USER", status: "ACTIVE" } });
  if (user) {
    const { count } = await db.user.updateMany({
      where: {
        id: user.id,
        OR: [{ passwordResetSentAt: null }, { passwordResetSentAt: { lt: new Date(Date.now() - RESET_COOLDOWN_MS) } }],
      },
      data: { passwordResetSentAt: new Date() },
    });
    if (count === 1) {
      const url = `${siteUrl}/reset-password?token=${await signResetToken(user)}`;
      sendLater("Password reset", () => sendPasswordResetEmail({ ...user, url }));
    }
  }
  // The same answer either way, so this form can't be used to find out who has an account.
  return { success: "If that email has a Bivora account, we've sent a link to choose a new password. It expires in 1 hour." };
}

const resetSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match." });

const LINK_INVALID = "This link has expired or has already been used. Please request a new one.";

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await hit("reset-ip", await clientIp(), 20, 60 * MINUTE))) return { error: TOO_MANY };

  const token = await readResetToken(parsed.data.token);
  const user = token && (await db.user.findFirst({ where: { id: token.userId, role: "USER", status: "ACTIVE" } }));
  if (!token || !user || !matchesPassword(user.passwordHash, token.fp)) return { error: LINK_INVALID };

  // Only changes the password the link was issued for, so a link can't be used twice at once.
  // A new session version signs out every device that was logged in.
  const { count } = await db.user.updateMany({
    where: { id: user.id, passwordHash: user.passwordHash },
    data: { passwordHash: await hashPassword(parsed.data.password), sessionVersion: { increment: 1 }, arkPasswordEnc: null },
  });
  if (count === 0) return { error: LINK_INVALID };
  await reset("login-email", user.email);
  redirect("/login?reset=1");
}

export async function logout() {
  await deleteSession("client");
  redirect("/login");
}

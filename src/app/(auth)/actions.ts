"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { formValues, type FormState } from "@/lib/form";

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z.string().trim().regex(/^(\+[1-9]\d{6,14})?$/, "Enter a valid phone number.").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { password, ...data } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "An account with this email already exists.", values };

  // TODO(ark): create the ARK trading account here and store arkAccountId.
  const user = await db.user.create({
    data: {
      ...data,
      phone: data.phone || null,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  await createSession("client", { userId: user.id });
  redirect("/onboarding");
}

const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

// The proxy sends unauthenticated visitors to /login?next=<path>; the form
// posts back to that URL, so the referer carries the return path.
async function returnPath() {
  const referer = (await headers()).get("referer");
  if (!referer) return null;
  const next = new URL(referer).searchParams.get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  // Super admins sign in through /admin/login only.
  if (!user || !valid || user.role !== "USER") return { error: "Incorrect email or password.", values };
  if (user.status !== "ACTIVE") {
    return { error: "Your account is suspended. Please contact support.", values };
  }

  await createSession("client", { userId: user.id });
  redirect((await returnPath()) ?? "/dashboard");
}

export async function logout() {
  await deleteSession("client");
  redirect("/login");
}

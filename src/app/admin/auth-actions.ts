"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";
import { MAX_PASSWORD, checkPassword } from "@/lib/passwords";
import { MINUTE, TOO_MANY, clientIp, hit, isLimited, reset } from "@/lib/rate-limit";
import { createSession, deleteSession } from "@/lib/session";

const schema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password.").max(MAX_PASSWORD, "Invalid administrator credentials."),
});

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { email, password } = parsed.data;
  // Stricter than client login: 5 wrong passwords lock the email for 30 minutes, 20 tries per address.
  if (!(await hit("admin-login-ip", await clientIp(), 20, 30 * MINUTE)) || (await isLimited("admin-login-email", email, 5, 30 * MINUTE))) {
    return { error: TOO_MANY, values };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await checkPassword(password, user?.passwordHash);
  if (!user || !valid || user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") {
    await hit("admin-login-email", email, 5, 30 * MINUTE);
    return { error: "Invalid administrator credentials.", values };
  }

  await reset("admin-login-email", email);
  await createSession("admin", user);
  redirect("/admin");
}

export async function adminLogout() {
  await deleteSession("admin");
  redirect("/admin/login");
}

"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";
import { createSession, deleteSession } from "@/lib/session";

const schema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !valid || user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") {
    return { error: "Invalid administrator credentials.", values };
  }

  await createSession("admin", { userId: user.id });
  redirect("/admin");
}

export async function adminLogout() {
  await deleteSession("admin");
  redirect("/admin/login");
}

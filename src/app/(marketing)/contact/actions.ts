"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { formValues, type FormState } from "@/lib/form";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  message: z.string().trim().min(10, "Please write a little more so we can help.").max(2000),
});

const THANKS = "Thanks! We've received your message and will reply by email.";

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  // Bots fill the hidden "website" field. They get the normal reply, but nothing is saved.
  if (formData.get("website")) return { success: THANKS };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: formValues(formData) };

  await db.contactMessage.create({ data: parsed.data });
  return { success: THANKS };
}

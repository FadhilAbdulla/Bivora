"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOnboardingUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form";
import { canEditKyc, isKycComplete } from "@/lib/kyc";
import { TERMS_VERSION } from "@/lib/terms";

const schema = z.object({
  terms: z.literal("on", { error: "Please agree to the terms and conditions." }),
  risk: z.literal("on", { error: "Please confirm that you understand the risks." }),
});

export async function acceptTerms(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOnboardingUser();
  if (!canEditKyc(user.kycStatus)) redirect("/dashboard");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const documents = await db.kycDocument.findMany({ where: { userId: user.id }, select: { type: true, slot: true, mimeType: true } });
  if (!isKycComplete(documents)) redirect("/onboarding");

  await db.user.update({
    where: { id: user.id },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      kycStatus: "PENDING",
      kycNote: null,
      kycSubmittedAt: new Date(),
    },
  });
  // The form shows a short confirmation, then moves on to the review screen.
  return { success: "Submitted." };
}

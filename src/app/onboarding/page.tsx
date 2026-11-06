import { redirect } from "next/navigation";
import { requireDocumentsUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { KYC_DOCS, canEditKyc, isDocComplete } from "@/lib/kyc";

// Sends the client to the first step they still need to finish.
export default async function OnboardingPage() {
  const user = await requireDocumentsUser();
  if (!canEditKyc(user.kycStatus)) redirect("/dashboard");
  // After a rejection, start from the top so every document can be replaced.
  if (user.kycStatus === "REJECTED") redirect(`/onboarding/${KYC_DOCS[0].step}`);

  const documents = await db.kycDocument.findMany({ where: { userId: user.id } });
  const next = KYC_DOCS.find((def) => !isDocComplete(def, documents));
  redirect(`/onboarding/${next?.step ?? "terms"}`);
}

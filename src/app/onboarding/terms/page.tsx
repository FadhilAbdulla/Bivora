import { redirect } from "next/navigation";
import { TermsContent } from "@/components/terms-content";
import { requireOnboardingUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditKyc, isKycComplete } from "@/lib/kyc";
import { TermsForm } from "./terms-form";

export default async function OnboardingTermsPage() {
  const user = await requireOnboardingUser();
  if (!canEditKyc(user.kycStatus)) redirect("/dashboard");
  const documents = await db.kycDocument.findMany({ where: { userId: user.id }, select: { type: true, slot: true, mimeType: true } });
  if (!isKycComplete(documents)) redirect("/onboarding");

  return (
    <div className="step-in">
      <h1 className="text-2xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
      <p className="mt-1 text-sm text-muted">Please read these before you finish.</p>
      <div className="mt-4 max-h-[38dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-4 sm:p-5" tabIndex={0}>
        <TermsContent />
      </div>
      <TermsForm />
    </div>
  );
}

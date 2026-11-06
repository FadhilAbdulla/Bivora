import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { requireOnboardingUser } from "@/lib/auth";
import { isKycInReview } from "@/lib/kyc";

// Where clients wait after submitting: nothing on the account opens until a super admin approves their documents.
export default async function ReviewPage() {
  const user = await requireOnboardingUser();
  if (!isKycInReview(user.kycStatus)) redirect("/onboarding");

  return (
    <div role="status" className="step-in pb-8 pt-6 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand/10 text-brand">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">We&apos;re reviewing your documents</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Your account opens as soon as they&apos;re approved. There&apos;s nothing else you need to do.
      </p>
      <ButtonLink href="/dashboard" className="mt-6 w-full py-3 text-base">
        Check status
      </ButtonLink>
    </div>
  );
}

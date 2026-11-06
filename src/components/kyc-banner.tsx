import { getCurrentUser } from "@/lib/auth";
import { isKycInReview } from "@/lib/kyc";
import { Alert } from "./ui";

/** Tells the client where their identity check stands, until it's approved. */
export async function KycBanner() {
  const user = await getCurrentUser();
  if (!user || !isKycInReview(user.kycStatus)) return null;
  return (
    <div className="mb-5">
      <Alert tone="info">We&apos;re reviewing your documents. Deposits and withdrawals open once they&apos;re approved.</Alert>
    </div>
  );
}

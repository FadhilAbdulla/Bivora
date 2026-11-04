import { getCurrentUser } from "@/lib/auth";
import { Alert } from "./ui";

/** Tells the client where their identity check stands, until it's approved. */
export async function KycBanner() {
  const user = await getCurrentUser();
  if (user?.kycStatus === "PENDING") {
    return <div className="mb-5"><Alert tone="info">We&apos;re reviewing your documents. We&apos;ll update your account once they&apos;re checked.</Alert></div>;
  }
  return null;
}

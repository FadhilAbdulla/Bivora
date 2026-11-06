"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui";

const GOOGLE_ERRORS: Record<string, string> = {
  "no-account": "There's no Bivora account for that Google email. Please open an account first.",
  failed: "We couldn't sign you in with Google. Please try again, or use your email and password.",
  suspended: "Your account is suspended. Please contact support.",
};

/** Messages passed to the login page by redirects. Render inside Suspense. */
export function LoginNotice() {
  const params = useSearchParams();
  const google = params.get("google");
  if (params.get("reset")) {
    return <div className="mt-3"><Alert tone="success">Your password has been saved. You can log in now.</Alert></div>;
  }
  return google ? <div className="mt-3"><Alert tone="error">{GOOGLE_ERRORS[google] ?? GOOGLE_ERRORS.failed}</Alert></div> : null;
}

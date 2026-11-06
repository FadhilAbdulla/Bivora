import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The link in the address bar is a secret, so it must not reach other sites.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">At least 8 characters, with a letter and a number.</p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

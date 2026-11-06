import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted">
        Enter your email and we&apos;ll send a link to choose a new one. This also works if you&apos;ve never set a password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-4 text-sm text-muted sm:mt-6">
        <Link href="/login" className="text-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

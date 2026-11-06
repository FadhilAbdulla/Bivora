import type { Metadata } from "next";
import Link from "next/link";
import { isGoogleConfigured } from "@/lib/google";
import { GoogleSignIn } from "../google-sign-in";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Open account",
  description: "Open a Bivora account in under a minute and trade stocks, indices, commodities and metals.",
};

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Open your account</h1>
      {/* Dropped on short phones, so the whole form still fits without scrolling. */}
      <p className="mt-1 text-sm text-muted [@media(max-height:700px)]:hidden">Create your login, then verify your identity with a few documents.</p>
      <GoogleSignIn enabled={isGoogleConfigured()} label="Sign up with Google" />
      <SignupForm />
      <p className="mt-3 text-sm text-muted sm:mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

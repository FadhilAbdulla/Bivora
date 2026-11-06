import type { Metadata } from "next";
import Link from "next/link";
import { isGoogleConfigured } from "@/lib/google";
import { GoogleSignIn } from "../google-sign-in";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Bivora account to manage deposits, withdrawals and your trading account.",
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to manage your funds and trading account.</p>
      <GoogleSignIn enabled={isGoogleConfigured()} />
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New to Bivora?{" "}
        <Link href="/signup" className="text-brand hover:underline">
          Open an account
        </Link>
      </p>
    </div>
  );
}

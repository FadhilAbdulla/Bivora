import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Bivora account to manage deposits, withdrawals and your trading account.",
};

export default function LoginPage() {
  return (
    <Card className="border-0 bg-transparent p-0 sm:p-2">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to manage your funds and trading account.</p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        New to Bivora?{" "}
        <Link href="/signup" className="text-brand hover:underline">
          Open an account
        </Link>
      </p>
    </Card>
  );
}

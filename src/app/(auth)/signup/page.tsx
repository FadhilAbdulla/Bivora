import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Open account",
  description: "Open a Bivora account in under a minute and trade stocks, indices, commodities and metals.",
};

export default function SignupPage() {
  return (
    <Card className="border-0 bg-transparent p-0 sm:p-2">
      <h1 className="text-2xl font-semibold tracking-tight">Open your account</h1>
      <p className="mt-1 text-sm text-muted">It takes less than a minute.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}

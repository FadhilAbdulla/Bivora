import { redirect } from "next/navigation";
import { requireOnboardingUser } from "@/lib/auth";
import { PhoneForm } from "./phone-form";

// Google doesn't share a phone number, so clients who sign up with Google add one here first.
export default async function PhonePage() {
  const user = await requireOnboardingUser();
  if (user.phone) redirect("/onboarding");

  return (
    <div className="step-in">
      <h1 className="text-2xl font-semibold tracking-tight">Add your mobile number</h1>
      <p className="mt-1 text-sm text-muted">Hi {user.firstName}, we need this to open your account.</p>
      <PhoneForm />
    </div>
  );
}

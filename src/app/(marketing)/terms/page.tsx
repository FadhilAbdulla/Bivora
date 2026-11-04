import type { Metadata } from "next";
import { TermsContent } from "@/components/terms-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for using a Bivora account.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
      <div className="mt-8 max-w-3xl">
        <TermsContent />
      </div>
    </div>
  );
}

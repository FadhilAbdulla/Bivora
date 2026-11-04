import type { Metadata } from "next";
import { SymbolOverview } from "@/components/markets/tradingview";
import { Card } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the Bivora team at support@bivoramarkets.com.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-x-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-muted">
          Email us at{" "}
          <a href="mailto:support@bivoramarkets.com" className="font-medium text-brand hover:underline">
            support@bivoramarkets.com
          </a>{" "}
          or send a message using the form.
        </p>
      </div>
      {/* On phones the form comes straight after the heading; on desktop it fills the right column. */}
      <Card className="p-4 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <ContactForm />
      </Card>
      <Card className="overflow-hidden p-2">
        <SymbolOverview symbol="OANDA:XAUUSD" name="Gold" className="h-[300px]" />
      </Card>
    </div>
  );
}

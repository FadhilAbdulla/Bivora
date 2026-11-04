import type { Metadata } from "next";
import { SymbolOverview } from "@/components/markets/tradingview";
import { Reveal } from "@/components/motion";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "About us",
  description: "Bivora gives traders one clear place to access global markets and manage their funds.",
};

const values = [
  {
    title: "Clarity",
    body: "Every deposit, withdrawal and balance change is recorded, so you can always see where your money is and why.",
  },
  {
    title: "Care",
    body: "Real people review funding requests and identity documents, because your money deserves more than an automated check.",
  },
  {
    title: "Focus",
    body: "We concentrate on four markets: stocks, indices, commodities and metals, all from a single account.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Who we are</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Bivora is a trading platform for people who want to access global markets without the confusion that often
            comes with it. Your account brings funding, live prices and your trading activity together in one dashboard
            that works just as well on your phone as on your computer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/signup" className="px-6 py-3">
              Open account
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" className="px-6 py-3">
              Contact us
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <Card className="overflow-hidden p-2">
            <SymbolOverview symbol="FOREXCOM:SPXUSD" name="S&P 500" className="h-[320px]" />
          </Card>
        </Reveal>
      </div>

      <div>
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What we stand for</h2>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <Card className="h-full p-5">
                <h3 className="font-semibold text-brand">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

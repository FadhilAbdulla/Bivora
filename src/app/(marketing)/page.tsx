import Link from "next/link";
import { MarketOverview, TradingViewAttribution } from "@/components/markets/tradingview";
import { CountUp, Reveal } from "@/components/motion";
import { ButtonLink, Card } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/markets";

const platform = [
  {
    title: "Fast, tracked funding",
    body: "Deposit by bank transfer, card or USDT and follow each request from submission to credit.",
    icon: "M12 5v14M5 12l7 7 7-7",
  },
  {
    title: "Live account overview",
    body: "Balance, equity, margin and open positions from your trading account in one place.",
    icon: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  },
  {
    title: "Simple withdrawals",
    body: "Save your bank details once and request a payout in seconds.",
    icon: "M12 19V5M5 12l7-7 7 7",
  },
  {
    title: "Complete ledger",
    body: "Every credit and debit is recorded with a running balance, so nothing goes unexplained.",
    icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  },
  {
    title: "Pro charting",
    body: "Professional charts with indicators and drawing tools inside your dashboard.",
    icon: "M3 3v18h18M7 14l3-3 3 3 5-6",
  },
  {
    title: "Reviewed by people",
    body: "Our finance team checks every deposit and withdrawal before it touches your account.",
    icon: "M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  },
];

const steps = [
  { title: "Open your account", body: "Register with your email in under a minute." },
  { title: "Fund your wallet", body: "Submit a deposit with your preferred payment method." },
  { title: "Trade global markets", body: "Once approved, your funds are ready to trade." },
];

const accounts = [
  { name: "Standard", deposit: 50, points: ["Leverage up to 1:500", "Zero commission", "All 4 markets", "24/5 support"] },
  {
    name: "Pro",
    deposit: 1000,
    points: ["Leverage up to 1:500", "Lower spreads", "Priority withdrawals", "Dedicated support"],
    featured: true,
  },
  { name: "VIP", deposit: 10000, points: ["Custom leverage", "Lowest spreads", "Same-day withdrawals", "Personal account manager"] },
];

const faqs = [
  { q: "Which markets can I trade?", a: "Stocks, indices, commodities and metals — all from a single trading account." },
  {
    q: "How long do deposits take?",
    a: "Deposit requests are reviewed by our finance team, usually within a few hours on business days. You can follow each request in your dashboard.",
  },
  {
    q: "How do I withdraw my funds?",
    a: "Save your bank account in your profile, then go to Withdraw, choose the account and enter the amount. Once approved, funds are sent to you.",
  },
  { q: "Is there a minimum deposit?", a: "The minimum deposit is $50 for a Standard account." },
];

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-muted">{body}</p>}
    </Reveal>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Markets */}
      <section id="markets" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="Markets"
          title="Four markets. One account."
          body="Trade the world's most active markets from a single account, without switching platforms."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {ASSET_CLASSES.map((c, i) => (
              <Reveal key={c.id} delay={i * 100}>
                <Link
                  href={`/markets#${c.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl hover:shadow-brand/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 transition-all group-hover:bg-brand group-hover:text-on-brand group-hover:shadow-lg group-hover:shadow-brand/40">
                      <Icon d={c.icon} />
                    </span>
                    <span className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand">→</span>
                  </div>
                  <h3 className="mt-5 text-lg font-medium">{c.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted">{c.description}</p>
                  <p className="mt-5 flex flex-wrap gap-1.5">
                    {c.instruments.slice(0, 4).map((inst) => (
                      <span key={inst.tv} className="rounded-md border border-line bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted">
                        {inst.label}
                      </span>
                    ))}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <Card className="h-full overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="font-medium">Live prices</h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span className="live-dot size-1.5 rounded-full bg-up" />
                  Live
                </span>
              </div>
              <MarketOverview className="h-[500px] px-2" />
              <div className="px-5 pb-4">
                <TradingViewAttribution />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="scroll-mt-32 border-y border-line bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="Platform"
            title="Your entire account, in one dashboard."
            body="Built around how traders actually manage their money."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platform.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5">
                  <span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon d={f.icon} />
                  </span>
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{f.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <ol className="mt-16 grid gap-6 border-t border-line pt-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 150}>
                <li className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand/5 font-mono text-sm text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Accounts */}
      <section id="accounts" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="Accounts" title="Choose how you trade." body="Start small and upgrade as you grow." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {accounts.map((a, i) => (
            <Reveal key={a.name} delay={i * 120}>
              <div
                className={
                  a.featured
                    ? "glow-border relative h-full rounded-xl p-7 shadow-2xl shadow-brand/10"
                    : "h-full rounded-xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-line hover:shadow-xl"
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{a.name}</h3>
                  {a.featured && <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-on-brand">Most popular</span>}
                </div>
                <p className="mt-5 text-sm text-muted">Minimum deposit</p>
                <p className="font-mono text-4xl font-semibold">
                  <CountUp to={a.deposit} prefix="$" />
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <Icon d="M5 12l5 5L20 7" className="size-4 text-up" />
                      {p}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/signup" variant={a.featured ? "primary" : "secondary"} className="mt-7 w-full">
                  Open {a.name} account
                </ButtonLink>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-32 border-t border-line bg-surface/40">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions, answered." />
          <Reveal delay={100}>
            <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium transition-colors hover:text-brand">
                    {f.q}
                    <span className="text-muted transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand/20 via-surface to-surface px-6 py-16 text-center">
            <div className="grid-bg animate-pan absolute inset-0 opacity-60" aria-hidden />
            <div className="animate-drift absolute -top-24 left-1/3 h-64 w-96 rounded-full bg-brand/25 blur-[90px]" aria-hidden />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">Ready when the market is.</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-muted">Open your account in a minute and fund it today.</p>
            <div className="relative mt-8 flex justify-center gap-3">
              <ButtonLink href="/signup" className="px-6 py-3 text-base">
                Open live account
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="px-6 py-3 text-base">
                Client login
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

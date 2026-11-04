import { HeroTerminal } from "@/components/markets/hero-terminal";
import { CountUp } from "@/components/motion";
import { ButtonLink } from "@/components/ui";

const enter = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg animate-pan absolute inset-0" aria-hidden />
      <div className="animate-drift absolute -top-40 left-1/4 h-[32rem] w-[48rem] rounded-full bg-brand/14 blur-[120px]" aria-hidden />
      <div className="animate-drift-slow absolute -bottom-40 right-0 h-[26rem] w-[36rem] rounded-full bg-gold/8 blur-[120px]" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p
            className="animate-enter inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-muted"
            style={enter(0)}
          >
            <span className="live-dot size-1.5 rounded-full bg-up" />
            Live markets · Stocks · Indices · Commodities · Metals
          </p>
          <h1 className="animate-enter mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl" style={enter(120)}>
            Trade global markets
            <br />
            <span className="text-shimmer bg-gradient-to-r from-brand via-cyan to-gold bg-clip-text text-transparent">
              with precision.
            </span>
          </h1>
          <p className="animate-enter mt-6 max-w-xl text-lg text-muted" style={enter(240)}>
            Professional charts, live prices and a single dashboard for your funds. Deposit, trade and withdraw with
            full visibility at every step.
          </p>
          <div className="animate-enter mt-8 flex flex-wrap gap-3" style={enter(360)}>
            <ButtonLink href="/signup" className="px-6 py-3 text-base">
              Open live account
            </ButtonLink>
            <ButtonLink href="/markets" variant="secondary" className="px-6 py-3 text-base">
              Explore markets
            </ButtonLink>
          </div>
          <dl className="animate-enter mt-12 grid max-w-lg grid-cols-4 gap-4 border-t border-line pt-6" style={enter(480)}>
            <div>
              <dd className="font-mono text-2xl font-semibold"><CountUp to={4} /></dd>
              <dt className="mt-1 text-xs text-muted">Markets</dt>
            </div>
            <div>
              <dd className="font-mono text-2xl font-semibold"><CountUp to={500} prefix="1:" /></dd>
              <dt className="mt-1 text-xs text-muted">Max leverage</dt>
            </div>
            <div>
              <dd className="font-mono text-2xl font-semibold"><CountUp to={50} prefix="$" /></dd>
              <dt className="mt-1 text-xs text-muted">Minimum deposit</dt>
            </div>
            <div>
              <dd className="font-mono text-2xl font-semibold">24/5</dd>
              <dt className="mt-1 text-xs text-muted">Client support</dt>
            </div>
          </dl>
        </div>
        <div className="animate-enter" style={enter(300)}>
          <div className="animate-float">
            <HeroTerminal />
          </div>
        </div>
      </div>
    </section>
  );
}

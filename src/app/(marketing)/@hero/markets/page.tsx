import { ASSET_CLASSES } from "@/lib/markets";

export default function MarketsHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="grid-bg animate-pan absolute inset-0" aria-hidden />
      <div className="animate-drift absolute -top-32 left-1/3 h-80 w-[40rem] rounded-full bg-brand/12 blur-[110px]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="animate-enter text-xs font-semibold uppercase tracking-[0.18em] text-gold">Markets</p>
        <h1 className="animate-enter mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl" style={{ "--delay": "100ms" } as React.CSSProperties}>
          Four markets. One account.
        </h1>
        <p className="animate-enter mt-4 max-w-xl text-lg text-muted" style={{ "--delay": "200ms" } as React.CSSProperties}>
          Stocks, indices, commodities and metals — trade them all from a single Bivora account.
        </p>
        <nav className="animate-enter mt-8 flex flex-wrap gap-2" style={{ "--delay": "300ms" } as React.CSSProperties}>
          {ASSET_CLASSES.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm text-muted transition-colors hover:border-brand/50 hover:text-foreground">
              {c.title}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

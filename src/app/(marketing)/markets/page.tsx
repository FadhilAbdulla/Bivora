import type { Metadata } from "next";
import { Reveal } from "@/components/motion";
import { ButtonLink } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Markets",
  description: "Trade stocks, indices, commodities and metals from one Bivora account.",
};

export default function MarketsPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {ASSET_CLASSES.map((c, i) => (
          <section key={c.id} id={c.id} className="grid scroll-mt-32 gap-10 border-b border-line py-20 last:border-0 lg:grid-cols-2">
            <Reveal className={i % 2 ? "lg:order-2" : ""}>
              <span className="grid size-12 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={c.icon} />
                </svg>
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-3 text-muted">{c.description}</p>
              <ul className="mt-6 space-y-2.5">
                {c.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <svg viewBox="0 0 24 24" className="size-4 text-up" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/signup" className="mt-8">
                Trade {c.title.toLowerCase()}
              </ButtonLink>
            </Reveal>
            <Reveal delay={150} className={i % 2 ? "lg:order-1" : ""}>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <p className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Popular {c.title.toLowerCase()}
                </p>
                <ul>
                  {c.instruments.map((inst) => (
                    <li key={inst.tv} className="flex items-center justify-between border-b border-line/60 px-5 py-3.5 text-sm transition-colors last:border-0 hover:bg-surface-2">
                      <span className="font-mono font-medium">{inst.label}</span>
                      <span className="text-muted">{inst.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        ))}
      </div>
    </>
  );
}

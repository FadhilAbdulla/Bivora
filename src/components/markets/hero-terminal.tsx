"use client";

import Link from "next/link";
import { useState } from "react";
import { HERO_INSTRUMENTS } from "@/lib/markets";
import { cn } from "@/components/ui";
import { SymbolOverview } from "./tradingview";

/** Hero "trading terminal": live price and candles for a few headline instruments. */
export function HeroTerminal() {
  const [active, setActive] = useState(HERO_INSTRUMENTS[0]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center justify-between border-b border-line px-3">
        <div className="flex overflow-x-auto" role="tablist">
          {HERO_INSTRUMENTS.map((i) => (
            <button
              key={i.tv}
              role="tab"
              aria-selected={i.tv === active.tv}
              onClick={() => setActive(i)}
              className={cn(
                "border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors",
                i.tv === active.tv ? "border-brand text-foreground" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 pr-1 text-xs text-muted">
          <span className="live-dot size-1.5 rounded-full bg-up" />
          Live
        </span>
      </div>

      <SymbolOverview key={active.tv} symbol={active.tv} name={active.name} className="h-[380px] px-2 pt-2" />

      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Link
          href="/signup"
          className="rounded-lg bg-down/12 px-4 py-3 text-center ring-1 ring-down/25 transition-all hover:-translate-y-0.5 hover:bg-down/20"
        >
          <span className="block text-sm font-semibold uppercase tracking-wider text-down">Sell</span>
          <span className="block text-[11px] text-muted">{active.label}</span>
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-up/12 px-4 py-3 text-center ring-1 ring-up/25 transition-all hover:-translate-y-0.5 hover:bg-up/20"
        >
          <span className="block text-sm font-semibold uppercase tracking-wider text-up">Buy</span>
          <span className="block text-[11px] text-muted">{active.label}</span>
        </Link>
      </div>
    </div>
  );
}

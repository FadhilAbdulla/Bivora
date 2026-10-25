"use client";

import { useState } from "react";
import { ASSET_CLASSES, type AssetClass } from "@/lib/markets";
import { cn } from "@/components/ui";
import { AdvancedChart, MarketQuotes, TradingViewAttribution } from "./tradingview";

/** Chart + instrument picker across all four markets, used on the dashboard Markets page. */
export function MarketsWorkspace({ chartClassName = "h-[420px] sm:h-[600px]" }: { chartClassName?: string }) {
  const [tab, setTab] = useState<AssetClass>("metals");
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const active = ASSET_CLASSES.find((c) => c.id === tab)!;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <AdvancedChart key={symbol} symbol={symbol} className={chartClassName} />
        </div>
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap gap-1 border-b border-line p-2">
            {ASSET_CLASSES.map((c) => (
              <button
                key={c.id}
                onClick={() => setTab(c.id)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  tab === c.id ? "bg-brand/15 text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {c.title}
              </button>
            ))}
          </div>
          <ul className="flex-1 overflow-y-auto">
              {active.instruments.map((i) => (
                <li key={i.tv}>
                  <button
                    onClick={() => setSymbol(i.tv)}
                    className={cn(
                      "flex w-full items-center justify-between border-b border-line/60 px-4 py-3 text-left text-sm hover:bg-surface-2",
                      symbol === i.tv && "bg-brand/8",
                    )}
                  >
                    <span>
                      <span className="block font-mono font-medium">{i.label}</span>
                      <span className="block text-xs text-muted">{i.name}</span>
                    </span>
                    <span className={cn("text-xs", symbol === i.tv ? "text-brand" : "text-muted")}>
                      {symbol === i.tv ? "Charting" : "Chart →"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface p-2">
        <MarketQuotes className="h-[420px] sm:h-[480px]" />
      </div>
      <TradingViewAttribution />
    </div>
  );
}

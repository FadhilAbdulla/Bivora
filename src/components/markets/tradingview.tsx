"use client";

import { memo, useEffect, useRef } from "react";
import { ASSET_CLASSES, TICKER_TAPE, type AssetClass } from "@/lib/markets";

// TradingView embeddable widgets (free, live/delayed quotes for stocks, indices,
// commodities and metals). Each widget loads TradingView's embed script.

function TradingViewWidget({
  script,
  config,
  className,
}: {
  script: string;
  config: Record<string, unknown>;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const json = JSON.stringify(config);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/${script}.js`;
    s.type = "text/javascript";
    s.async = true;
    s.innerHTML = json;
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [script, json]);

  // TradingView restyles its container, so the size lives on an outer wrapper.
  return (
    <div className={className}>
      <div ref={container} className="tradingview-widget-container h-full w-full" />
    </div>
  );
}

const Widget = memo(TradingViewWidget);

export function TradingViewAttribution() {
  return (
    <p className="text-[11px] text-muted/70">
      Market data by{" "}
      <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow" className="hover:text-muted">
        TradingView
      </a>
    </p>
  );
}

export function TickerTape() {
  return (
    <Widget
      script="embed-widget-ticker-tape"
      className="min-h-[46px]"
      config={{
        symbols: TICKER_TAPE,
        showSymbolLogo: true,
        isTransparent: true,
        displayMode: "compact",
        colorTheme: "dark",
        locale: "en",
      }}
    />
  );
}

/** Compact live price list with a tab per market (no charts). */
export function MarketOverview({
  classes = ["indices", "metals", "commodities", "stocks"],
  className = "h-[460px]",
}: {
  classes?: AssetClass[];
  className?: string;
}) {
  const tabs = classes.map((id) => {
    const c = ASSET_CLASSES.find((x) => x.id === id)!;
    return {
      title: c.title,
      originalTitle: c.title,
      symbols: c.instruments.map((i) => ({ s: i.tv, d: i.name })),
    };
  });
  return (
    <Widget
      script="embed-widget-market-overview"
      className={className}
      config={{
        colorTheme: "dark",
        dateRange: "1D",
        showChart: false,
        locale: "en",
        width: "100%",
        height: "100%",
        isTransparent: true,
        showSymbolLogo: true,
        showFloatingTooltip: false,
        tabs,
      }}
    />
  );
}

/** Live price header and candle chart for a single instrument. */
export function SymbolOverview({ symbol, name, className }: { symbol: string; name: string; className?: string }) {
  return (
    <Widget
      script="embed-widget-symbol-overview"
      className={className}
      config={{
        symbols: [[name, `${symbol}|5D`]],
        chartOnly: false,
        width: "100%",
        height: "100%",
        locale: "en",
        colorTheme: "dark",
        autosize: true,
        isTransparent: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: "10",
        noTimeScale: false,
        valuesTracking: "1",
        changeMode: "price-and-percent",
        chartType: "candlesticks",
        headerFontSize: "large",
        dateRanges: ["5d|5", "1m|30", "3m|60", "12m|1D"],
        upColor: "#37be8c",
        downColor: "#f6465d",
        borderUpColor: "#37be8c",
        borderDownColor: "#f6465d",
        wickUpColor: "#37be8c",
        wickDownColor: "#f6465d",
        gridLineColor: "rgba(255,255,255,0.04)",
      }}
    />
  );
}

export function MarketQuotes({
  classes = ["stocks", "indices", "commodities", "metals"],
  className = "h-[520px]",
}: {
  classes?: AssetClass[];
  className?: string;
}) {
  const groups = ASSET_CLASSES.filter((c) => classes.includes(c.id)).map((c) => ({
    name: c.title,
    originalName: c.title,
    symbols: c.instruments.map((i) => ({ name: i.tv, displayName: `${i.label} · ${i.name}` })),
  }));
  return (
    <Widget
      script="embed-widget-market-quotes"
      className={className}
      config={{
        width: "100%",
        height: "100%",
        symbolsGroups: groups,
        showSymbolLogo: true,
        isTransparent: true,
        colorTheme: "dark",
        backgroundColor: "rgba(0,0,0,0)",
        locale: "en",
      }}
    />
  );
}

export function AdvancedChart({ symbol, className = "h-[560px]" }: { symbol: string; className?: string }) {
  return (
    <Widget
      script="embed-widget-advanced-chart"
      className={className}
      config={{
        autosize: true,
        symbol,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        backgroundColor: "#0e1211",
        gridColor: "rgba(255,255,255,0.04)",
        allow_symbol_change: true,
        hide_side_toolbar: false,
        calendar: false,
        withdateranges: true,
        support_host: "https://www.tradingview.com",
      }}
    />
  );
}

import { TickerTape } from "./tradingview";

/** Moving live-price strip that pins under the site header once scrolled to. */
export function StickyTicker() {
  return (
    <div className="sticky top-16 z-30 border-y border-line bg-background/80 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px]">
        <TickerTape />
      </div>
    </div>
  );
}

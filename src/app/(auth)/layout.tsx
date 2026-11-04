import { Logo } from "@/components/logo";
import { MarketOverview, TickerTape } from "@/components/markets/tradingview";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line bg-surface/40">
        <TickerTape />
      </div>
      <div className="grid flex-1 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-line bg-surface/50 lg:block">
          <div className="grid-bg animate-pan absolute inset-0" aria-hidden />
          <div className="animate-drift absolute -left-20 top-0 h-96 w-96 rounded-full bg-brand/15 blur-[100px]" aria-hidden />
          <div className="relative mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-6 px-8 py-10">
            <Logo large />
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Four markets. Live prices. One account.</h2>
              <p className="mt-3 text-muted">
                Stocks, indices, commodities and metals — with every deposit and withdrawal tracked.
              </p>
            </div>
            <div className="animate-enter overflow-hidden rounded-xl border border-line bg-background/70 p-2 backdrop-blur">
              <MarketOverview className="h-[440px]" />
            </div>
            <p className="text-xs text-muted">Trading leveraged products carries a high level of risk.</p>
          </div>
        </aside>
        <div className="flex items-center justify-center px-4 py-8 sm:px-8 lg:py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Logo large />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

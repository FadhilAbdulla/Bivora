import { Logo } from "@/components/logo";
import { MarketOverview } from "@/components/markets/tradingview";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface/50 lg:flex lg:flex-col">
        <div className="grid-bg animate-pan absolute inset-0" aria-hidden />
        <div className="animate-drift absolute -left-20 top-0 h-96 w-96 rounded-full bg-brand/15 blur-[100px]" aria-hidden />
        <div className="relative flex flex-1 flex-col justify-between p-10">
          <Logo />
          <div>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight">
              Four markets. Live prices. One account.
            </h2>
            <p className="mt-3 max-w-md text-muted">
              Stocks, indices, commodities and metals — with every deposit and withdrawal tracked.
            </p>
            <div className="animate-enter mt-8 max-w-md overflow-hidden rounded-xl border border-line bg-background/70 p-2 backdrop-blur">
              <MarketOverview className="h-[400px]" />
            </div>
          </div>
          <p className="text-xs text-muted">Trading leveraged products carries a high level of risk.</p>
        </div>
      </aside>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

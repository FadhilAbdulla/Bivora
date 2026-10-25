import type { Metadata } from "next";
import { ArkPendingNotice } from "@/components/ark-pending";
import { Card, CardHeader, EmptyState, PageHeader, StatCard, Table, cn } from "@/components/ui";
import { getAccountSummary, getOpenPositions, getTradeHistory, isArkConnected } from "@/lib/ark";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Trading account" };

export default async function TradingPage() {
  const user = await requireUser();

  if (!isArkConnected() || !user.arkAccountId) {
    return (
      <>
        <PageHeader title="Trading account" description="Your live trading account on our trading platform." />
        <ArkPendingNotice />
      </>
    );
  }

  const [summary, positions, history] = await Promise.all([
    getAccountSummary(user.arkAccountId),
    getOpenPositions(user.arkAccountId),
    getTradeHistory(user.arkAccountId),
  ]);
  const money = (n: number) => formatMoney(n, summary.currency);

  return (
    <>
      <PageHeader title="Trading account" description={`Account ${summary.accountId} · Leverage 1:${summary.leverage}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Balance" value={money(summary.balance)} />
        <StatCard label="Equity" value={money(summary.equity)} tone="brand" />
        <StatCard label="Margin" value={money(summary.margin)} />
        <StatCard
          label="Free margin"
          value={money(summary.freeMargin)}
          hint={summary.marginLevel != null ? `Margin level ${summary.marginLevel.toFixed(0)}%` : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Open positions" />
        {positions.length === 0 ? (
          <EmptyState title="No open positions." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th className="text-right">Volume</th>
                <th className="text-right">Open</th>
                <th className="text-right">Current</th>
                <th className="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.ticket}>
                  <td className="font-medium">{p.symbol}</td>
                  <td className={p.side === "BUY" ? "text-up" : "text-down"}>{p.side}</td>
                  <td className="text-right font-mono">{p.volume}</td>
                  <td className="text-right font-mono">{p.openPrice}</td>
                  <td className="text-right font-mono">{p.currentPrice}</td>
                  <td className={cn("text-right font-mono", p.profit >= 0 ? "text-up" : "text-down")}>{money(p.profit)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Trade history" />
        {history.length === 0 ? (
          <EmptyState title="No closed trades yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Closed</th>
                <th>Symbol</th>
                <th>Side</th>
                <th className="text-right">Volume</th>
                <th className="text-right">Open</th>
                <th className="text-right">Close</th>
                <th className="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.ticket}>
                  <td className="whitespace-nowrap text-muted">{formatDate(t.closedAt)}</td>
                  <td className="font-medium">{t.symbol}</td>
                  <td className={t.side === "BUY" ? "text-up" : "text-down"}>{t.side}</td>
                  <td className="text-right font-mono">{t.volume}</td>
                  <td className="text-right font-mono">{t.openPrice}</td>
                  <td className="text-right font-mono">{t.closePrice}</td>
                  <td className={cn("text-right font-mono", t.profit >= 0 ? "text-up" : "text-down")}>{money(t.profit)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

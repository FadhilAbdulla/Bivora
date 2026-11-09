import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountMoney } from "@/components/ark-account-money";
import { ArkPendingNotice } from "@/components/ark-pending";
import { Alert, Card, CardHeader, EmptyState, PageHeader, StatCard, Table, cn } from "@/components/ui";
import { getClientArkAccount, type ArkTrade } from "@/lib/ark/account";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Trading account" };

const price = (n?: number) => (n === undefined ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 5 }));

export default async function TradingPage() {
  const user = await requireUser();

  if (!user.arkUserId) {
    return (
      <>
        <PageHeader title="Trading account" description="Your live trading account on our trading platform." />
        <ArkPendingNotice />
      </>
    );
  }

  const account = await getClientArkAccount(user.arkUserId);
  const money = (n?: number) => (n === undefined ? "—" : formatMoney(n, user.currency));
  const header = (
    <PageHeader
      title="Trading account"
      description={[user.arkUsername && `Username ${user.arkUsername}`, user.arkAccountId && `Account ${user.arkAccountId}`].filter(Boolean).join(" · ")}
    />
  );

  if ("error" in account) {
    return (
      <>
        {header}
        <Alert tone="info">Your trading account can&apos;t be loaded right now. Please try again in a few minutes.</Alert>
        <Suspense fallback={null}>
          <div className="mt-6"><AccountMoney userId={user.id} arkUserId={user.arkUserId} currency={user.currency} /></div>
        </Suspense>
      </>
    );
  }

  const s = account.summary;
  return (
    <>
      {header}
      {account.partial && (
        <div className="mb-4">
          <Alert tone="info">Part of your account couldn&apos;t be loaded right now. What&apos;s shown is up to date.</Alert>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Balance" value={money(s?.balance)} />
        <StatCard label="Equity" value={money(s?.equity)} tone="brand" />
        <StatCard
          label="Open profit/loss"
          value={money(s?.profit)}
          tone={s?.profit !== undefined && s.profit < 0 ? undefined : "up"}
        />
        <StatCard label="Credit" value={money(s?.credit)} />
        <StatCard label="Bonus" value={money(s?.bonus)} />
        <StatCard
          label="Free margin"
          value={money(s?.freeMargin)}
          hint={[s?.margin !== undefined && `Used ${money(s.margin)}`, s?.marginLevel !== undefined && s.marginLevel > 0 && `Level ${s.marginLevel.toFixed(0)}%`].filter(Boolean).join(" · ") || undefined}
        />
      </div>
      {(s?.deposits !== undefined || s?.withdrawals !== undefined || s?.closedProfit !== undefined) && (
        <p className="mt-3 text-sm text-muted">
          {[
            s?.deposits !== undefined && `Total deposits ${money(s.deposits)}`,
            s?.withdrawals !== undefined && `Total withdrawals ${money(s.withdrawals)}`,
            s?.closedProfit !== undefined && `Closed profit ${money(s.closedProfit)}`,
          ].filter(Boolean).join(" · ")}
        </p>
      )}

      <Card className="mt-6 min-w-0">
        <CardHeader title="Open positions" />
        <Trades rows={account.open} money={money} kind="open" />
      </Card>

      <Card className="mt-6 min-w-0">
        <CardHeader title="Trade history" description="Closed trades from the last 90 days." />
        <Trades rows={account.closed} money={money} kind="closed" />
      </Card>

      <Suspense fallback={null}>
        <div className="mt-6"><AccountMoney userId={user.id} arkUserId={user.arkUserId} currency={user.currency} /></div>
      </Suspense>
    </>
  );
}

function Trades({ rows, money, kind }: { rows: ArkTrade[]; money: (n?: number) => string; kind: "open" | "closed" }) {
  if (rows.length === 0) return <EmptyState title={kind === "open" ? "No open positions." : "No closed trades in the last 90 days."} />;
  // ARK's open positions carry no profit per trade; the column shows only when it does.
  const showProfit = rows.some((t) => t.profit !== undefined);
  return (
    <Table>
      <thead>
        <tr>
          <th>{kind === "open" ? "Opened" : "Closed"}</th>
          <th>Symbol</th>
          <th>Side</th>
          <th className="text-right">Volume</th>
          <th className="text-right">Open</th>
          <th className="text-right">{kind === "open" ? "Current" : "Close"}</th>
          {showProfit && <th className="text-right">Profit</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={t.ticket || i}>
            <td className="whitespace-nowrap text-muted">{(kind === "open" ? t.openedAt : t.closedAt) || "—"}</td>
            <td className="font-medium">{t.symbol || "—"}</td>
            <td className={t.side === "Buy" ? "text-up" : t.side === "Sell" ? "text-down" : ""}>{t.side || "—"}</td>
            <td className="text-right font-mono">{price(t.volume)}</td>
            <td className="text-right font-mono">{price(t.openPrice)}</td>
            <td className="text-right font-mono">{price(kind === "open" ? t.currentPrice : t.closePrice)}</td>
            {showProfit && <td className={cn("whitespace-nowrap text-right font-mono", (t.profit ?? 0) < 0 ? "text-down" : "text-up")}>{money(t.profit)}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

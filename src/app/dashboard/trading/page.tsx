import type { Metadata } from "next";
import { Suspense } from "react";
import { ArkPendingNotice } from "@/components/ark-pending";
import { Alert, Card, CardHeader, EmptyState, PageHeader, StatCard, Table, cn } from "@/components/ui";
import { getClientArkAccount, type ArkTrade } from "@/lib/ark/account";
import { TRANSACTION_TYPES, syncClientArkMoney } from "@/lib/ark/reports";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
          <AccountMoney userId={user.id} arkUserId={user.arkUserId} currency={user.currency} />
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Balance" value={money(s?.balance)} />
        <StatCard label="Equity" value={money(s?.equity)} tone="brand" />
        <StatCard label="Credit" value={money(s?.credit)} />
        <StatCard
          label="Free margin"
          value={money(s?.freeMargin)}
          hint={[s?.margin !== undefined && `Margin ${money(s.margin)}`, s?.marginLevel !== undefined && s.marginLevel > 0 && `Level ${s.marginLevel.toFixed(0)}%`].filter(Boolean).join(" · ") || undefined}
        />
      </div>
      {s?.profit !== undefined && (
        <p className={cn("mt-3 text-sm", s.profit < 0 ? "text-down" : "text-up")}>Open profit/loss: {money(s.profit)}</p>
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
        <AccountMoney userId={user.id} arkUserId={user.arkUserId} currency={user.currency} />
      </Suspense>
    </>
  );
}

function Trades({ rows, money, kind }: { rows: ArkTrade[]; money: (n?: number) => string; kind: "open" | "closed" }) {
  if (rows.length === 0) return <EmptyState title={kind === "open" ? "No open positions." : "No closed trades in the last 90 days."} />;
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
          <th className="text-right">Profit</th>
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
            <td className={cn("whitespace-nowrap text-right font-mono", (t.profit ?? 0) < 0 ? "text-down" : "text-up")}>{money(t.profit)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Deposits, withdrawals, credit and bonuses on the trading account. ARK's internal comments stay hidden. */
async function AccountMoney({ userId, arkUserId, currency }: { userId: string; arkUserId: string; currency: string }) {
  await syncClientArkMoney(arkUserId);
  const rows = await db.arkTransaction.findMany({ where: { userId }, orderBy: [{ time: "desc" }, { id: "desc" }], take: 50 });
  return (
    <Card className="mt-6 min-w-0">
      <CardHeader title="Account money" description="Deposits, withdrawals, credit and bonuses on your trading account." />
      {rows.length === 0 ? (
        <EmptyState title="No money movements yet." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const amount = Number(r.amount);
            const out = r.type === 2 || r.type === 4 || (r.type === 5 && amount < 0);
            return (
              <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                <div>
                  <p className="font-medium">{TRANSACTION_TYPES[r.type] ?? "Transaction"}</p>
                  <p className="text-xs text-muted">{r.time.slice(0, 16)}</p>
                </div>
                <p className={cn("shrink-0 font-mono font-medium tabular-nums", out ? "text-down" : "text-up")}>
                  {out ? "−" : "+"}{formatMoney(Math.abs(amount), currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

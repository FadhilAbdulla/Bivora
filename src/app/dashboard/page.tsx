import type { Metadata } from "next";
import { Suspense } from "react";
import { ArkPendingNotice } from "@/components/ark-pending";
import { MarketOverview } from "@/components/markets/tradingview";
import { FundRequestTable } from "@/components/fund-request-table";
import { ButtonLink, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { getClientArkAccount } from "@/lib/ark/account";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAvailableBalance } from "@/lib/funds";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [{ balance, available, pendingWithdrawals }, pendingDeposits, totals, recent] = await Promise.all([
    getAvailableBalance(user.id),
    db.fundRequest.aggregate({
      where: { userId: user.id, type: "DEPOSIT", status: "PENDING" },
      _sum: { amount: true },
    }),
    db.fundRequest.groupBy({
      by: ["type"],
      where: { userId: user.id, status: "APPROVED" },
      _sum: { amount: true },
    }),
    db.fundRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const totalOf = (type: string) => totals.find((t) => t.type === type)?._sum.amount ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description="Here's an overview of your funds and trading account."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/deposit">Deposit</ButtonLink>
            <ButtonLink href="/dashboard/withdraw" variant="secondary">
              Withdraw
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatMoney(balance, user.currency)} tone="up" />
        <StatCard
          label="Available to withdraw"
          value={formatMoney(available, user.currency)}
          hint={Number(pendingWithdrawals) > 0 ? `${formatMoney(pendingWithdrawals)} in pending withdrawals` : undefined}
        />
        <StatCard
          label="Pending deposits"
          value={formatMoney(pendingDeposits._sum.amount ?? 0, user.currency)}
          tone={Number(pendingDeposits._sum.amount ?? 0) > 0 ? "warning" : undefined}
          hint="Awaiting review"
        />
        <StatCard
          label="Total deposited"
          value={formatMoney(totalOf("DEPOSIT"), user.currency)}
          hint={`${formatMoney(totalOf("WITHDRAWAL"), user.currency)} withdrawn`}
        />
      </div>

      <div className="mt-6">
        {user.arkUserId ? (
          <Suspense fallback={<TradingCard loading />}>
            <TradingSummary arkUserId={user.arkUserId} currency={user.currency} />
          </Suspense>
        ) : (
          <ArkPendingNotice compact />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="min-w-0">
          <CardHeader
            title="Recent activity"
            description="Your latest deposit and withdrawal requests."
            action={
              <ButtonLink href="/dashboard/transactions" variant="ghost">
                View all
              </ButtonLink>
            }
          />
          <FundRequestTable requests={recent} compact emptyText="No deposit or withdrawal requests yet." />
        </Card>
        <Card className="self-start overflow-hidden">
          <CardHeader title="Markets" />          <MarketOverview className="h-[420px] px-1" />
        </Card>
      </div>
    </>
  );
}

async function TradingSummary({ arkUserId, currency }: { arkUserId: string; currency: string }) {
  const account = await getClientArkAccount(arkUserId);
  if ("error" in account || !account.summary) return <TradingCard />;
  const s = account.summary;
  const money = (n?: number) => (n === undefined ? "—" : formatMoney(n, currency));
  return (
    <TradingCard>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[["Balance", s.balance], ["Equity", s.equity], ["Open P/L", s.profit], ["Free margin", s.freeMargin]].map(([label, value]) => (
          <div key={label as string}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-0.5 font-mono font-medium tabular-nums">{money(value as number | undefined)}</p>
          </div>
        ))}
      </div>
    </TradingCard>
  );
}

function TradingCard({ children, loading }: { children?: React.ReactNode; loading?: boolean }) {
  return (
    <Card className="p-5" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">Trading account</p>
        <ButtonLink href="/dashboard/trading" variant="secondary">View trading account</ButtonLink>
      </div>
      {loading ? <div className="mt-3 h-10 animate-pulse rounded-md bg-surface-2" /> : children}
    </Card>
  );
}

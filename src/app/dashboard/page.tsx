import type { Metadata } from "next";
import { ArkPendingNotice } from "@/components/ark-pending";
import { FundRequestTable } from "@/components/fund-request-table";
import { TradingFinancials } from "@/components/trading-financials";
import { ButtonLink, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { tradingAccountsOf } from "@/lib/trading-accounts";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  // Bivora's own data only: ARK's financial standing streams in separately (TradingSummary).
  const [pendingDeposits, totals, recent] = await Promise.all([
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

  const accounts = tradingAccountsOf(user);
  const totalOf = (type: string) => totals.find((t) => t.type === type)?._sum.amount ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description="Here's an overview of your trading account and requests."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/deposit">Deposit</ButtonLink>
            <ButtonLink href="/dashboard/withdraw" variant="secondary">
              Withdraw
            </ButtonLink>
          </div>
        }
      />

      {/* Rendered from Bivora's data at once; each account's figures load from ARK in the browser. */}
      {accounts.length === 0 ? (
        <ArkPendingNotice compact />
      ) : (
        <div className="grid gap-4">
          {accounts.map((a) => (
            <TradingFinancials
              key={a.arkUserId}
              account={a}
              currency={user.currency}
              action={<ButtonLink href="/dashboard/trading" variant="secondary">View trading account</ButtonLink>}
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      </div>
    </>
  );
}

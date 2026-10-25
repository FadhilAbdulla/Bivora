import type { Metadata } from "next";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { FundRequestTable } from "@/components/fund-request-table";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAvailableBalance } from "@/lib/funds";
import { maskAccountNumber } from "@/lib/bank";
import { formatMoney } from "@/lib/money";
import { WithdrawForm } from "./withdraw-form";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const [{ balance, available, pendingWithdrawals }, requests, bankAccounts] = await Promise.all([
    getAvailableBalance(user.id),
    db.fundRequest.findMany({
      where: { userId: user.id, type: "WITHDRAWAL" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.bankAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader title="Withdraw funds" description="Request a payout from your wallet. Withdrawals are reviewed before they're sent." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Wallet balance" value={formatMoney(balance, user.currency)} />
        <StatCard label="Pending withdrawals" value={formatMoney(pendingWithdrawals, user.currency)} />
        <StatCard label="Available to withdraw" value={formatMoney(available, user.currency)} tone="brand" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <Card>
          <CardHeader title="New withdrawal" />
          <WithdrawForm
            available={available.toFixed(2)}
            bankAccounts={bankAccounts.map((a) => ({
              id: a.id,
              label: `${a.bankName} · ${maskAccountNumber(a.accountNumber)}${a.isDefault ? " (default)" : ""}`,
            }))}
          />
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Withdrawal history" />
          <FundRequestTable
            requests={requests}
            emptyText="No withdrawals yet."
            actions={(r) => (r.status === "PENDING" ? <CancelRequestButton id={r.id} /> : null)}
          />
        </Card>
      </div>
    </>
  );
}

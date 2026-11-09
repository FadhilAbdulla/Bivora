import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountMoney } from "@/components/ark-account-money";
import { FundRequestTable } from "@/components/fund-request-table";
import { Card, CardHeader, EmptyState, PageHeader, Table, cn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const user = await requireUser();
  const [requests, ledger] = await Promise.all([
    db.fundRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <>
      <PageHeader title="Transactions" description="Money on your trading account, your requests and every change to your wallet balance." />
      {user.arkUserId && (
        <div className="mb-6">
          <Suspense
            fallback={
              <Card aria-busy>
                <CardHeader title="Account money" description="Loading your trading account…" />
                <div className="space-y-3 p-4 sm:p-5">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-surface-2" />)}</div>
              </Card>
            }
          >
            <AccountMoney userId={user.id} arkUserId={user.arkUserId} currency={user.currency} />
          </Suspense>
        </div>
      )}
      <Card>
        <CardHeader title="Balance ledger" description="Credits and debits applied to your wallet." />
        {ledger.length === 0 ? (
          <EmptyState title="No balance changes yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="text-right">Amount</th>
                <th className="hidden text-right sm:table-cell">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td className="text-muted sm:whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td>{e.description}</td>
                  <td className={cn("text-right font-mono tabular-nums", e.amount.isPositive() ? "text-up" : "text-down")}>
                    {e.amount.isPositive() ? "+" : "−"}
                    {formatMoney(e.amount.abs(), user.currency)}
                  </td>
                  <td className="hidden text-right font-mono tabular-nums sm:table-cell">{formatMoney(e.balanceAfter, user.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card className="mt-6">
        <CardHeader title="Requests" description="Deposit and withdrawal requests and their status." />
        <FundRequestTable requests={requests} />
      </Card>
    </>
  );
}

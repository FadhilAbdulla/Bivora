import type { Metadata } from "next";
import { FundRequestTable } from "@/components/fund-request-table";
import { Card, CardHeader, EmptyState, PageHeader, Table, cn } from "@/components/ui";
import { TRANSACTION_TYPES } from "@/lib/ark/reports";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const user = await requireUser();
  // Only what was done in Bivora: no ARK request on this page.
  const [requests, ledger, money] = await Promise.all([
    db.fundRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    // Money Bivora posted to the trading account, once ARK confirmed it.
    db.arkMoneyTransaction.findMany({ where: { userId: user.id, status: "DONE" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <>
      <PageHeader title="Transactions" description="Money on your trading account, your requests and every change to your wallet balance." />
      {user.arkUserId && (
        <Card className="mb-6 min-w-0">
          <CardHeader title="Trading account money" description="Deposits, withdrawals, credit and bonuses Bivora made on your trading account." />
          {money.length === 0 ? (
            <EmptyState title="No money movements yet." />
          ) : (
            <ul className="divide-y divide-line">
              {money.map((r) => {
                const amount = Number(r.amount);
                const out = r.type === 2 || r.type === 4 || (r.type === 5 && amount < 0);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                    <div>
                      <p className="font-medium">{TRANSACTION_TYPES[r.type] ?? "Transaction"}</p>
                      <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
                    </div>
                    <p className={cn("shrink-0 font-mono font-medium tabular-nums", out ? "text-down" : "text-up")}>
                      {out ? "−" : "+"}
                      {formatMoney(Math.abs(amount), user.currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
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

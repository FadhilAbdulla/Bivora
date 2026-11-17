import type { Metadata } from "next";
import Link from "next/link";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { FundRequestTable } from "@/components/fund-request-table";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isKycApproved } from "@/lib/kyc";
import { MAX_BANK_ACCOUNTS, maskAccountNumber } from "@/lib/bank";
import { WithdrawForm } from "./withdraw-form";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const [requests, bankAccounts] = await Promise.all([
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

  // Every trading account the client has; today that's their one ARK account.
  const tradingAccounts = user.arkUserId && user.arkUsername
    ? [{ id: user.arkUsername, label: `${user.arkUsername} · ${user.arkIsDemo ? "Demo" : "Real"}` }]
    : [];

  return (
    <>
      <PageHeader title="Withdraw funds" description="Request a payout from your trading account to your bank. Withdrawals are reviewed before they're sent." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <Card>
          <CardHeader title="New withdrawal" />
          {!isKycApproved(user.kycStatus) ? (
            <div className="p-5">
              <Alert tone="info">You can withdraw once your documents are approved.</Alert>
            </div>
          ) : requests.some((r) => r.status === "PENDING") ? (
            <div className="p-5">
              <Alert tone="info">
                Your withdrawal is waiting for review. You can request another once it is approved, rejected or cancelled.
              </Alert>
            </div>
          ) : tradingAccounts.length === 0 ? (
            <div className="p-5">
              <Alert tone="info">Your trading account is still being set up. You can withdraw once it&apos;s ready.</Alert>
            </div>
          ) : (
            <WithdrawForm
              tradingAccounts={tradingAccounts}
              canAddBank={bankAccounts.length < MAX_BANK_ACCOUNTS}
              bankAccounts={bankAccounts.map((a) => ({
                id: a.id,
                label: `${a.bankName} · ${maskAccountNumber(a.accountNumber)}${a.isDefault ? " (default)" : ""}`,
              }))}
            />
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader
            title="Withdrawal requests"
            description={<>Withdrawals you&apos;ve requested here and their status. Money already on your trading account is under <Link href="/dashboard/transactions" className="font-medium text-brand hover:underline">Transactions</Link>.</>}
          />
          <FundRequestTable
            requests={requests}
            emptyText="No withdrawal requests yet."
            actions={(r) => (r.status === "PENDING" ? <CancelRequestButton id={r.id} /> : null)}
          />
        </Card>
      </div>
    </>
  );
}

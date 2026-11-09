import type { Metadata } from "next";
import Link from "next/link";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { FundRequestTable } from "@/components/fund-request-table";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isKycApproved } from "@/lib/kyc";
import { DepositForm } from "./deposit-form";

export const metadata: Metadata = { title: "Deposit" };

export default async function DepositPage() {
  const user = await requireUser();
  const requests = await db.fundRequest.findMany({
    where: { userId: user.id, type: "DEPOSIT" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <PageHeader title="Deposit funds" description="Submit a deposit request. Funds are credited once our team confirms your payment." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <Card>
          <CardHeader title="New deposit" />
          {isKycApproved(user.kycStatus) ? (
            <DepositForm />
          ) : (
            <div className="p-5">
              <Alert tone="info">You can deposit once your documents are approved.</Alert>
            </div>
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader
            title="Deposit requests"
            description={<>Deposits you&apos;ve requested here and their status. Money already on your trading account is under <Link href="/dashboard/transactions" className="font-medium text-brand hover:underline">Transactions</Link>.</>}
          />
          <FundRequestTable
            requests={requests}
            emptyText="No deposit requests yet."
            actions={(r) => (r.status === "PENDING" ? <CancelRequestButton id={r.id} /> : null)}
          />
        </Card>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { FundRequestTable } from "@/components/fund-request-table";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
          <DepositForm />
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Deposit history" />
          <FundRequestTable
            requests={requests}
            emptyText="No deposits yet."
            actions={(r) => (r.status === "PENDING" ? <CancelRequestButton id={r.id} /> : null)}
          />
        </Card>
      </div>
    </>
  );
}

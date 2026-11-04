import type { Metadata } from "next";
import Link from "next/link";
import { FundRequestTable } from "@/components/fund-request-table";
import { ButtonLink, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const [pending, clients, balances, approved, queue, verifications] = await Promise.all([
    db.fundRequest.groupBy({
      by: ["type"],
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    db.user.count({ where: { role: "USER" } }),
    db.user.aggregate({ where: { role: "USER" }, _sum: { balance: true } }),
    db.fundRequest.groupBy({ by: ["type"], where: { status: "APPROVED" }, _sum: { amount: true } }),
    db.fundRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    }),
    db.user.findMany({ where: { role: "USER", kycStatus: "PENDING" }, orderBy: { kycSubmittedAt: "asc" }, take: 10 }),
  ]);

  const pendingOf = (type: string) => pending.find((p) => p.type === type);
  const approvedOf = (type: string) => approved.find((p) => p.type === type)?._sum.amount ?? 0;

  return (
    <>
      <PageHeader title="Admin overview" description="Review pending fund requests and monitor client balances." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending deposits"
          value={pendingOf("DEPOSIT")?._count ?? 0}
          hint={formatMoney(pendingOf("DEPOSIT")?._sum.amount ?? 0)}
          tone={pendingOf("DEPOSIT") ? "warning" : undefined}
        />
        <StatCard
          label="Pending withdrawals"
          value={pendingOf("WITHDRAWAL")?._count ?? 0}
          hint={formatMoney(pendingOf("WITHDRAWAL")?._sum.amount ?? 0)}
          tone={pendingOf("WITHDRAWAL") ? "warning" : undefined}
        />
        <StatCard label="Client balances" value={formatMoney(balances._sum.balance ?? 0)} hint={`${clients} clients`} tone="brand" />
        <StatCard
          label="Total deposited"
          value={formatMoney(approvedOf("DEPOSIT"))}
          hint={`${formatMoney(approvedOf("WITHDRAWAL"))} withdrawn`}
        />
      </div>

      {verifications.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Identity checks to review" description="Open a client to view their documents." />
          <ul className="divide-y divide-line text-sm">
            {verifications.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
                  <span className="min-w-0">
                    <span className="block font-medium">{u.firstName} {u.lastName}</span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                  <span className="shrink-0 font-medium text-brand">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Review queue"
          description="Oldest pending requests first."
          action={
            <ButtonLink href="/admin/requests" variant="ghost">
              View all
            </ButtonLink>
          }
        />
        <FundRequestTable
          requests={queue}
          showUser
          emptyText="Nothing to review. All caught up."
          actions={(r) => <ReviewActions id={r.id} type={r.type} amount={formatMoney(r.amount, r.currency)} />}
        />
      </Card>
    </>
  );
}

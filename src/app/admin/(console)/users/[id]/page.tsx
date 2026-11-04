import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FundRequestTable } from "@/components/fund-request-table";
import { Button, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge, Table, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAvailableBalance } from "@/lib/funds";
import { kycTitle } from "@/lib/kyc";
import { formatDate, formatMoney } from "@/lib/money";
import { setUserStatus } from "../../actions";
import { KycReview } from "../../kyc-review";
import { ReviewActions } from "../../review-actions";
import { AdjustBalanceForm } from "./adjust-balance-form";

export const metadata: Metadata = { title: "Client" };

export default async function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id, role: "USER" } });
  if (!user) notFound();

  const [{ available, pendingWithdrawals }, requests, ledger, bankAccounts, documents] = await Promise.all([
    getAvailableBalance(user.id),
    db.fundRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.bankAccount.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.kycDocument.findMany({ where: { userId: user.id }, orderBy: [{ type: "asc" }, { slot: "desc" }] }),
  ]);
  const suspended = user.status === "SUSPENDED";

  return (
    <>
      <Link href="/admin/users" className="text-sm text-muted hover:text-foreground">← All clients</Link>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        action={
          user.id !== admin.id && (
            <form action={setUserStatus}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="status" value={suspended ? "ACTIVE" : "SUSPENDED"} />
              <Button variant={suspended ? "secondary" : "danger"}>
                {suspended ? "Reactivate account" : "Suspend account"}
              </Button>
            </form>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatMoney(user.balance, user.currency)} tone="brand" />
        <StatCard label="Available" value={formatMoney(available, user.currency)} hint={`${formatMoney(pendingWithdrawals)} pending withdrawal`} />
        <Card className="p-5 text-sm">
          <p className="text-muted">Status</p>
          <div className="mt-2"><StatusBadge status={user.status} /></div>
          <p className="mt-2 text-xs text-muted">Joined {formatDate(user.createdAt)}</p>
        </Card>
        <Card className="p-5 text-sm">
          <p className="text-muted">Contact</p>
          <p className="mt-2">{user.phone ?? "—"}</p>
          <p className="text-xs text-muted">{user.country ?? "—"} · ARK: {user.arkAccountId ?? "pending"}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Identity verification"
          description={user.termsAcceptedAt ? `Terms accepted ${formatDate(user.termsAcceptedAt)}` : "Terms not accepted yet"}
          action={<StatusBadge status={user.kycStatus} />}
        />
        {user.kycNote && <p className="border-b border-line px-5 py-3 text-sm text-muted">Note: {user.kycNote}</p>}
        {documents.length === 0 ? (
          <EmptyState title="No documents uploaded yet." />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">
                    {kycTitle(d.type)}
                    {d.slot === "BACK" ? " (back)" : d.slot === "FRONT" ? " (front)" : ""}
                  </p>
                  <p className="truncate text-xs text-muted">{d.fileName}</p>
                </div>
                <a href={`/api/kyc/${d.id}`} target="_blank" rel="noopener" className="shrink-0 px-2 py-2 font-medium text-brand hover:underline">
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
        {user.kycStatus === "PENDING" && <KycReview userId={user.id} />}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="min-w-0">
          <CardHeader title="Fund requests" />
          <FundRequestTable
            requests={requests}
            actions={(r) =>
              r.status === "PENDING" ? (
                <ReviewActions id={r.id} type={r.type} amount={formatMoney(r.amount, r.currency)} />
              ) : null
            }
          />
        </Card>
        <div className="space-y-6 self-start">
          <Card>
            <CardHeader title="Adjust balance" description="Manual credit or debit, recorded in the ledger." />
            <AdjustBalanceForm userId={user.id} />
          </Card>
          <Card>
            <CardHeader title="Bank accounts" description="Saved by the client for withdrawals." />
            {bankAccounts.length === 0 ? (
              <EmptyState title="No bank accounts saved." />
            ) : (
              <ul className="divide-y divide-line text-sm">
                {bankAccounts.map((a) => (
                  <li key={a.id} className="space-y-0.5 px-5 py-3">
                    <p className="flex items-center gap-2 font-medium">
                      {a.bankName}
                      {a.isDefault && <span className="rounded-full bg-up/15 px-2 text-[11px] text-up">Default</span>}
                    </p>
                    <p className="text-muted">{a.accountHolder} · {a.currency}</p>
                    <p className="font-mono text-xs text-muted">Acc {a.accountNumber}</p>
                    {a.iban && <p className="font-mono text-xs text-muted">IBAN {a.iban}</p>}
                    {a.swiftCode && <p className="font-mono text-xs text-muted">SWIFT {a.swiftCode}</p>}
                    {(a.branch || a.country) && <p className="text-xs text-muted">{[a.branch, a.country].filter(Boolean).join(", ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Balance ledger" />
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
    </>
  );
}

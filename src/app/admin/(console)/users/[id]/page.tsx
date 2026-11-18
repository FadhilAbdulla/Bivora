import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FundRequestTable } from "@/components/fund-request-table";
import { Button, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { KYC_DOCS, isDocComplete, isKycInReview, kycStage, kycTitle } from "@/lib/kyc";
import { formatDate, formatMoney } from "@/lib/money";
import { setUserStatus } from "../../actions";
import { KycReview, ResendCredentials } from "../../kyc-review";
import { ReviewActions } from "../../review-actions";
import { AdminDocuments } from "./admin-documents";
import { CreateArkButton } from "./create-ark";
import { DemoSwitch } from "./demo-switch";
import { ArkMoneySection, ArkMoneySectionLoading } from "./ark-money-section";
import { bankCodeName } from "@/lib/bank";

export const metadata: Metadata = { title: "Client" };

export default async function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id, role: "USER" } });
  if (!user) notFound();

  const [requests, bankAccounts, documents] = await Promise.all([
    db.fundRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
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

      <div className="grid gap-4 sm:grid-cols-2">
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
          action={<StatusBadge status={user.kycStatus} label={kycStage(user.kycStatus, documents)} />}
        />
        <ol className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line px-4 py-3 text-sm sm:grid-cols-4 sm:px-5">
          {[
            ...KYC_DOCS.map((def) => ({ label: def.title, done: isDocComplete(def, documents) })),
            { label: "Terms accepted", done: Boolean(user.termsAcceptedAt) && user.kycStatus !== "NOT_SUBMITTED" },
          ].map(({ label, done }) => (
            <li key={label} className={done ? "text-up" : "text-muted"}>
              <span aria-hidden>{done ? "✓" : "○"}</span> {label}
              <span className="sr-only">{done ? " complete" : " not complete"}</span>
            </li>
          ))}
        </ol>
        {user.kycNote && <p className="border-b border-line px-5 py-3 text-sm text-muted">Note: {user.kycNote}</p>}
        {user.kycStatus !== "APPROVED" && user.kycStatus !== "APPROVING" ? (
          <AdminDocuments
            userId={user.id}
            initialDocuments={documents.map((d) => ({ id: d.id, type: d.type, slot: d.slot, fileName: d.fileName, mimeType: d.mimeType, size: d.size }))}
          />
        ) : documents.length === 0 ? (
          <EmptyState title="No documents uploaded yet." />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">
                    {kycTitle(d.type)}
                    {d.slot === "BACK" ? " (back)" : d.slot === "FRONT" ? " (front)" : d.slot === "BOTH" ? " (front and back)" : ""}
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
        {isKycInReview(user.kycStatus) && <KycReview userId={user.id} />}
      </Card>

      {user.arkUserId && user.arkUsername && (
        <Card className="mt-6">
          <CardHeader
            title="ARK trading account"
            description={
              user.arkCredentialsSentAt
                ? `Login details emailed ${formatDate(user.arkCredentialsSentAt)}`
                : "Login details have not been sent yet"
            }
          />
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between gap-4 px-4 py-3 sm:px-5">
              <dt className="text-muted">Username</dt>
              <dd className="font-mono">{user.arkUsername}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3 sm:px-5">
              <dt className="text-muted">Account</dt>
              <dd className="font-mono">{user.arkAccountId ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <dt className="text-muted">Account type</dt>
              <dd className="flex items-center gap-3">
                <span className={user.arkIsDemo ? "font-medium text-warning" : "font-medium"}>{user.arkIsDemo ? "Demo" : "Real"}</span>
                <DemoSwitch userId={user.id} demo={user.arkIsDemo} />
              </dd>
            </div>
          </dl>
          <ResendCredentials userId={user.id} sent={Boolean(user.arkCredentialsSentAt)} />
        </Card>
      )}

      {!user.arkUserId && user.arkPasswordEnc && (
        <Card className="mt-6">
          <CardHeader
            title="ARK trading account"
            description="Not created yet. It uses the password you set for this client. Their trading login is emailed once their documents are uploaded."
            action={<CreateArkButton userId={user.id} />}
          />
        </Card>
      )}

      {user.arkUserId && (
        <Suspense fallback={<ArkMoneySectionLoading />}>
          <ArkMoneySection userId={user.id} />
        </Suspense>
      )}

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
                    {a.swiftCode && <p className="font-mono text-xs text-muted">{bankCodeName(a.swiftCode)} {a.swiftCode}</p>}
                    {(a.branch || a.country) && <p className="text-xs text-muted">{[a.branch, a.country].filter(Boolean).join(", ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

    </>
  );
}

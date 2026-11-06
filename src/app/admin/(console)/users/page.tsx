import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, Input, PageHeader, StatusBadge, Table } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycStage } from "@/lib/kyc";
import { formatDate, formatMoney } from "@/lib/money";
import { QuickApprove } from "../kyc-review";

export const metadata: Metadata = { title: "Clients" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const users = await db.user.findMany({
    where: {
      role: "USER",
      ...(query && {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { fundRequests: { where: { status: "PENDING" } } } },
      kycDocuments: { select: { type: true, slot: true, mimeType: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every registered account, its balance and status."
        action={
          <form className="relative w-full sm:w-72">
            <Input name="q" placeholder="Search name or email…" defaultValue={query} className={query ? "pr-10" : undefined} />
            {query && (
              <Link
                href="/admin/users"
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </Link>
            )}
          </form>
        }
      />
      <Card>
        {users.length === 0 ? (
          <EmptyState title="No clients found.">
            {query && (
              <Link href="/admin/users" className="font-medium text-brand hover:underline">
                Clear search
              </Link>
            )}
          </EmptyState>
        ) : (
          <div className="@container">
          <ul className="divide-y divide-line @3xl:hidden">
            {users.map((u) => (
              <li key={u.id} className="py-3.5">
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-4 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{u.firstName} {u.lastName}</span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono tabular-nums">{formatMoney(u.balance, u.currency)}</span>
                    <span className="mt-0.5 flex items-center justify-end gap-2">
                      {u._count.fundRequests > 0 && (
                        <span className="text-xs text-warning">{u._count.fundRequests} pending</span>
                      )}
                      <StatusBadge status={u.kycStatus} label={kycStage(u.kycStatus, u.kycDocuments)} />
                    </span>
                  </span>
                </Link>
                {u.kycStatus === "PENDING" && (
                  <div className="mt-2.5 px-4">
                    <QuickApprove userId={u.id} name={`${u.firstName} ${u.lastName}`} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden @3xl:block">
          <Table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Country</th>
                <th>Joined</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Pending</th>
                <th>Stage</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-brand">
                      {u.firstName} {u.lastName}
                    </Link>
                    <p className="text-xs text-muted [overflow-wrap:anywhere]">{u.email}</p>
                  </td>
                  <td className="text-muted">{u.country ?? "—"}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                  <td className="text-right font-mono tabular-nums">{formatMoney(u.balance, u.currency)}</td>
                  <td className="text-right">{u._count.fundRequests || "—"}</td>
                  <td><StatusBadge status={u.kycStatus} label={kycStage(u.kycStatus, u.kycDocuments)} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="text-right">
                    {u.kycStatus === "PENDING" && <QuickApprove userId={u.id} name={`${u.firstName} ${u.lastName}`} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
          </div>
        )}
      </Card>
    </>
  );
}

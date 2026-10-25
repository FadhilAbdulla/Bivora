import type { Metadata } from "next";
import Link from "next/link";
import { FundRequestTable } from "@/components/fund-request-table";
import { Card, PageHeader, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ReviewActions } from "../review-actions";

export const metadata: Metadata = { title: "Fund requests" };

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "ALL"] as const;
const TYPES = ["ALL", "DEPOSIT", "WITHDRAWAL"] as const;

function pick<T extends readonly string[]>(options: T, value: unknown, fallback: T[number]) {
  return options.includes(value as string) ? (value as T[number]) : fallback;
}

export default async function RequestsPage({ searchParams }: PageProps<"/admin/requests">) {
  await requireAdmin();
  const params = await searchParams;
  const status = pick(STATUSES, params.status, "PENDING");
  const type = pick(TYPES, params.type, "ALL");

  const requests = await db.fundRequest.findMany({
    where: {
      ...(status !== "ALL" && { status }),
      ...(type !== "ALL" && { type }),
    },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 200,
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });

  const href = (next: { status?: string; type?: string }) =>
    `/admin/requests?${new URLSearchParams({ status, type, ...next })}`;

  return (
    <>
      <PageHeader title="Fund requests" description="Approve or reject client deposits and withdrawals." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs options={STATUSES} active={status} href={(s) => href({ status: s })} />
        <Tabs options={TYPES} active={type} href={(t) => href({ type: t })} />
      </div>
      <Card>
        <FundRequestTable
          requests={requests}
          showUser
          emptyText="No requests match these filters."
          actions={(r) =>
            r.status === "PENDING" ? (
              <ReviewActions id={r.id} type={r.type} amount={formatMoney(r.amount, r.currency)} />
            ) : r.reviewedAt ? (
              <span className="text-xs text-muted">Reviewed</span>
            ) : null
          }
        />
      </Card>
    </>
  );
}

function Tabs<T extends string>({
  options,
  active,
  href,
}: {
  options: readonly T[];
  active: T;
  href: (value: T) => string;
}) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-1 text-sm">
      {options.map((o) => (
        <Link
          key={o}
          href={href(o)}
          className={cn(
            "shrink-0 rounded-md px-3 py-1 capitalize",
            o === active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {o.toLowerCase()}
        </Link>
      ))}
    </div>
  );
}

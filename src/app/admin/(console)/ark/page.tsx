import type { Metadata } from "next";
import Link from "next/link";
import { PendingArea, PendingForm, PendingLink } from "@/components/pending-nav";
import { Card, CardHeader, EmptyState, Input, PageHeader, StatCard, StatusBadge, buttonClass, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "ARK accounts" };

const PAGE = 100;
const param = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

/** Every client's trading account, from Bivora's own records: no ARK call. */
export default async function ArkAccountsPage({ searchParams }: PageProps<"/admin/ark">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q);
  const kind = param(sp.kind) === "real" || param(sp.kind) === "demo" ? param(sp.kind) : "";
  const page = Math.max(0, Number(param(sp.page)) || 0);

  const base = { role: "USER", arkUserId: { not: null } } as const;
  const where = {
    ...base,
    ...(kind && { arkIsDemo: kind === "demo" }),
    ...(q && {
      OR: [
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { arkUsername: { contains: q, mode: "insensitive" as const } },
        { arkUserId: q },
        { arkAccountId: q },
      ],
    }),
  };
  const [total, demo, matching, rows] = await Promise.all([
    db.user.count({ where: base }),
    db.user.count({ where: { ...base, arkIsDemo: true } }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE,
      take: PAGE,
      select: { id: true, firstName: true, lastName: true, email: true, arkUsername: true, arkUserId: true, arkAccountId: true, arkIsDemo: true, kycStatus: true, status: true, createdAt: true },
    }),
  ]);
  const keep = { ...(q && { q }), ...(kind && { kind }) };
  const href = (extra: Record<string, string>) => `/admin/ark?${new URLSearchParams({ ...keep, ...extra })}`;

  return (
    <PendingArea>
      <PageHeader title="ARK accounts" description="Every client's ARK trading account, from Bivora's records." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Trading accounts" value={total.toLocaleString("en-US")} />
        <StatCard label="Real" value={(total - demo).toLocaleString("en-US")} tone="up" />
        <StatCard label="Demo" value={demo.toLocaleString("en-US")} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Accounts"
          description={`${matching.toLocaleString("en-US")} ${q || kind ? "matching" : "in total"}, newest first.`}
          action={
            <div className="flex gap-1 text-sm">
              {[["", "All"], ["real", "Real"], ["demo", "Demo"]].map(([value, label]) => (
                <PendingLink
                  key={label}
                  href={`/admin/ark?${new URLSearchParams({ ...(q && { q }), ...(value && { kind: value }) })}`}
                  className={cn("rounded-lg px-2.5 py-1", kind === value ? "bg-surface-2 font-medium" : "text-muted hover:text-foreground")}
                >
                  {label}
                </PendingLink>
              ))}
            </div>
          }
        />
        <PendingForm action="/admin/ark" role="search" className="border-b border-line p-4 sm:px-5">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <Input name="q" type="search" placeholder="Search name, email, ARK username or ID…" defaultValue={q} />
        </PendingForm>
        {rows.length === 0 ? (
          <EmptyState title={q || kind ? "No accounts match." : "No trading accounts yet."} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-surface-2/60 sm:px-5">
                  <div className="min-w-0 flex-1 basis-56 [overflow-wrap:anywhere]">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{u.firstName} {u.lastName}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", u.arkIsDemo ? "bg-line text-muted" : "bg-up/15 text-up")}>
                        {u.arkIsDemo ? "Demo" : "Real"}
                      </span>
                      {u.status !== "ACTIVE" && <StatusBadge status={u.status} />}
                    </p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono">{u.arkUsername ?? "—"}</p>
                    <p className="font-mono text-xs text-muted">User {u.arkUserId}{u.arkAccountId ? ` · Account ${u.arkAccountId}` : ""}</p>
                    <p className="text-xs text-muted">Opened {formatDate(u.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(page > 0 || (page + 1) * PAGE < matching) && (
          <div className="flex justify-between gap-3 border-t border-line p-4 sm:px-5">
            {page > 0 ? <PendingLink href={href({ page: String(page - 1) })} className={buttonClass("secondary")}>Newer</PendingLink> : <span />}
            {(page + 1) * PAGE < matching && <PendingLink href={href({ page: String(page + 1) })} className={buttonClass("secondary")}>Older</PendingLink>}
          </div>
        )}
      </Card>
    </PendingArea>
  );
}

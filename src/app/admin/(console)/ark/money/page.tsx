import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import type { ReactNode } from "react";
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, buttonClass, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { MANUAL_MONEY_TYPES } from "@/lib/ark/client";
import { STUCK_MS } from "@/lib/ark-money";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { PendingArea, PendingForm, PendingLink } from "@/components/pending-nav";
import { AddMoneyButton, RetryButton } from "./money-form";
import { TRANSACTION_TYPES } from "@/lib/ark/reports";

export const metadata: Metadata = { title: "ARK money flow" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const day = (d: Date) => d.toISOString().slice(0, 10);
const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const id = (v?: string) => (v && /^\d{1,12}$/.test(v) ? Number(v) : undefined);

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ArkMoneyPage({ searchParams }: PageProps<"/admin/ark/money">) {
  await requireAdmin();
  const q = await searchParams;
  const today = new Date();
  const to = DATE.test(param(q.to) ?? "") ? param(q.to)! : day(today);
  let from = DATE.test(param(q.from) ?? "") ? param(q.from)! : day(new Date(today.getTime() - 30 * 86_400_000));
  if (from > to) from = to;
  const type = id(param(q.type));
  // From a client's page: that client is chosen in the New transaction form.
  const forClient = param(q.client);

  const arkClients = await db.user.findMany({
      where: { role: "USER", arkUserId: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, arkUsername: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const include = { user: { select: { id: true, firstName: true, lastName: true, currency: true } }, admin: { select: { email: true } } } as const;

  const header = (
    <PageHeader
      title="ARK money flow"
      description="Every money transaction made in Bivora: added here or approved from a request. From Bivora's records; ARK isn't asked."
      action={
        <AddMoneyButton
          key={forClient ?? ""}
          defaultClient={arkClients.some((c) => c.id === forClient) ? forClient : undefined}
          firstKey={randomUUID().replace(/-/g, "")}
          types={MANUAL_MONEY_TYPES}
          clients={arkClients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, detail: [c.arkUsername, c.email].filter(Boolean).join(" · ") }))}
        />
      }
    />
  );

  const keep = { from, to, ...(type && { type: String(type) }) };
  const filters = () => (
    <Card className="mb-6">
      <PendingForm action="/admin/ark/money" className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6 lg:items-end">
        <Field label="From">
          <Input type="date" name="from" defaultValue={from} max={to} />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={to} />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={type ? String(type) : ""}>
            <option value="">All types</option>
            {Object.entries(TRANSACTION_TYPES).map(([value, name]) => (
              <option key={value} value={value}>{name}</option>
            ))}
          </Select>
        </Field>
        <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-1">
          <Button type="submit" variant="secondary" className="w-full">Apply</Button>
        </div>
      </PendingForm>
    </Card>
  );

  // Bivora's own transactions: no ARK call at all.
  const PAGE = 100;
  // Older pages go by date, since the list mixes two kinds of row.
  const untilParam = param(q.until);
  const until = untilParam && !Number.isNaN(Date.parse(untilParam)) ? new Date(untilParam) : null;
  const range = { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59.999`), ...(until && { lt: until }) };
  // Approved deposit and withdrawal requests are posted to ARK as type 1 or 2.
  const requestType = type === 1 ? "DEPOSIT" : type === 2 ? "WITHDRAWAL" : undefined;
  const [manual, approved] = await Promise.all([
    db.arkMoneyTransaction.findMany({
      where: { createdAt: range, ...(type && { type }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      include,
    }),
    type && !requestType
      ? Promise.resolve([])
      : db.fundRequest.findMany({
          where: { status: "APPROVED", reviewedAt: range, ...(requestType && { type: requestType }) },
          orderBy: { reviewedAt: "desc" },
          take: PAGE + 1,
          include: { user: { select: { id: true, firstName: true, lastName: true, currency: true } }, reviewedBy: { select: { email: true } } },
        }),
  ]);
  const merged = [
    ...manual.map((r) => ({ ...r, request: false })),
    ...approved.map((r) => ({
      id: r.id,
      type: r.type === "DEPOSIT" ? 1 : 2,
      amount: r.amount,
      comment: r.adminNote ?? r.userNote,
      status: "DONE",
      error: null,
      arkTrxId: r.arkTrxId,
      // Approval emails aren't tracked per request, so no email tag for these.
      emailSentAt: r.reviewedAt,
      attemptAt: null,
      createdAt: r.reviewedAt ?? r.createdAt,
      user: r.user,
      admin: { email: r.reviewedBy?.email ?? "an admin" },
      request: true,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const rows = merged.slice(0, PAGE);
  const more = merged.length > PAGE ? rows[PAGE - 1].createdAt.toISOString() : null;
  const waiting = rows.filter((r) => r.status !== "DONE").length;
  return (
    <PendingArea>
      {header}
      {filters()}
      <Card>
        <CardHeader
          title="Made in Bivora"
          description={`${from} to ${to}, newest first.${waiting ? ` ${waiting} not completed: Retry is safe, ARK never posts the same transaction twice.` : ""}`}
          action={until ? <PendingLink href={`/admin/ark/money?${new URLSearchParams(keep)}`} className={buttonClass("ghost")}>Newest</PendingLink> : undefined}
        />
        <MadeList rows={rows} stuckBefore={today.getTime() - STUCK_MS} />
        {more && (
          <div className="border-t border-line p-4 text-center sm:p-5">
            <PendingLink href={`/admin/ark/money?${new URLSearchParams({ ...keep, until: more })}`} className={buttonClass("secondary")}>Load older transactions</PendingLink>
          </div>
        )}
      </Card>
    </PendingArea>
  );
}

function Tag({ tone, children }: { tone?: "brand" | "down" | "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "brand" ? "bg-brand/15 text-brand" : tone === "down" ? "bg-down/15 text-down" : tone === "warn" ? "bg-warning/15 text-warning" : "bg-line text-muted",
      )}
    >
      {children}
    </span>
  );
}

const STATUS: Record<string, { label: string; tone?: "brand" | "down" | "warn" }> = {
  DONE: { label: "Done", tone: "brand" },
  FAILED: { label: "Failed", tone: "down" },
  CHECK: { label: "Not confirmed by ARK", tone: "warn" },
  PENDING: { label: "Sending…" },
};

function MadeList({ rows, stuckBefore }: {
  /** Sends still running from before this were cut off. */
  stuckBefore: number;
  rows: {
    id: string;
    type: number;
    amount: { toString(): string };
    comment: string | null;
    status: string;
    error: string | null;
    arkTrxId: string | null;
    emailSentAt: Date | null;
    attemptAt: Date | null;
    createdAt: Date;
    user: { id: string; firstName: string; lastName: string; currency: string };
    admin: { email: string };
    /** An approved deposit or withdrawal request, posted to ARK on approval. */
    request?: boolean;
  }[];
}) {
  if (rows.length === 0) return <EmptyState title="No money transactions made in Bivora for these filters." />;
  const emailingSince = stuckBefore;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const amount = Number(r.amount);
        const minus = r.type === 2 || r.type === 4 || amount < 0;
        const status = STATUS[r.status] ?? { label: r.status };
        const stuck = r.status === "PENDING" && (r.attemptAt ?? r.createdAt).getTime() < stuckBefore;
        return (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
            <div className="min-w-0 flex-1 basis-56 [overflow-wrap:anywhere]">
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{MANUAL_MONEY_TYPES[r.type as keyof typeof MANUAL_MONEY_TYPES] ?? `Type ${r.type}`}</span>
                <Tag tone={status.tone}>{status.label}</Tag>
                {r.request && <Tag>Approved request</Tag>}
                {r.status === "DONE" && !r.emailSentAt && (
                  // The email goes out just after the transaction is saved, so a new one shows Emailing for a moment.
                  r.createdAt.getTime() > emailingSince ? <Tag>Emailing…</Tag> : <Tag tone="warn">Email not sent</Tag>
                )}
              </p>
              <p className="mt-0.5">
                <Link href={`/admin/users/${r.user.id}`} className="hover:text-brand">{r.user.firstName} {r.user.lastName}</Link>
                <span className="text-xs text-muted"> · {r.request ? "approved" : "by"} {r.admin.email} · {formatDate(r.createdAt)}</span>
              </p>
              {r.comment && <p className="text-xs text-muted">{r.comment}</p>}
              {r.error && r.status !== "DONE" && <p className="text-xs text-down">{r.error}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("font-mono font-medium tabular-nums", minus ? "text-down" : "text-up")}>
                {minus ? "−" : "+"}{money(Math.abs(amount))}
              </p>
              {r.arkTrxId && <p className="font-mono text-xs text-muted">#{r.arkTrxId}</p>}
              {!r.request && (r.status === "FAILED" || r.status === "CHECK" || stuck) && <div className="mt-1"><RetryButton id={r.id} /></div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

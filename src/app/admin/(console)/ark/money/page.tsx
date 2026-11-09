import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import type { ReactNode } from "react";
import { Alert, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, buttonClass, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { MANUAL_MONEY_TYPES } from "@/lib/ark/client";
import { STUCK_MS } from "@/lib/ark-money";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { PendingArea, PendingForm, PendingLink } from "@/components/pending-nav";
import { AddMoneyButton, RetryButton } from "./money-form";
import {
  TRANSACTION_TYPES,
  amountOf,
  bivoraAccounts,
  getArkMoney,
  isBivoraTransaction,
  saveArkTransactions,
  nameOf,
  parentIdOf,
  transactionIdOf,
  transactionTypeOf,
  userIdOf,
  type ArkRow,
} from "@/lib/ark/reports";

export const metadata: Metadata = { title: "ARK money flow" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const day = (d: Date) => d.toISOString().slice(0, 10);
const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const id = (v?: string) => (v && /^\d{1,12}$/.test(v) ? Number(v) : undefined);

// Money out of the account; adjustments keep ARK's own sign.
const OUT = new Set([2, 4]);
function signed(row: ArkRow) {
  const amount = amountOf(row);
  const type = transactionTypeOf(row);
  if (type === 5) return amount;
  return OUT.has(type ?? 0) ? -Math.abs(amount) : Math.abs(amount);
}
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ArkMoneyPage({ searchParams }: PageProps<"/admin/ark/money">) {
  await requireAdmin();
  const q = await searchParams;
  const today = new Date();
  const to = DATE.test(param(q.to) ?? "") ? param(q.to)! : day(today);
  let from = DATE.test(param(q.from) ?? "") ? param(q.from)! : day(new Date(today.getTime() - 30 * 86_400_000));
  if (from > to) from = to;
  const type = id(param(q.type));
  const source = param(q.source) === "bivora" || param(q.source) === "ark" ? param(q.source)! : "all";
  const demo = param(q.demo) === "1";
  const node = id(param(q.node));
  const before = id(param(q.before));
  // From a client's page: that client is chosen in the New transaction form.
  const forClient = param(q.client);

  const [result, accounts, arkClients, made] = await Promise.all([
    getArkMoney({ node, from, to, type: type && TRANSACTION_TYPES[type] ? type : undefined, demo, before }),
    bivoraAccounts(),
    db.user.findMany({
      where: { role: "USER", arkUserId: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, arkUsername: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    // Only the ones that didn't reach ARK: everything else is in ARK's list below.
    db.arkMoneyTransaction.findMany({
      where: { status: { not: "DONE" } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { id: true, firstName: true, lastName: true, currency: true } }, admin: { select: { email: true } } },
    }),
  ]);

  const header = (
    <>
      <PageHeader
        title="ARK money flow"
        description="Every money transaction on ARK, made in Bivora or in ARK directly."
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
      {made.length > 0 && (
        <Card className="mb-6 min-w-0 border-warning/40">
          <CardHeader title="Not posted to ARK yet" description="These didn't go through. Retry is safe: ARK never posts the same transaction twice." />
          <MadeList rows={made} stuckBefore={today.getTime() - STUCK_MS} />
        </Card>
      )}
    </>
  );
  if ("error" in result) {
    return (
      <>
        {header}
        <Alert tone="error">{result.error}</Alert>
        <p className="mt-3 text-sm">
          <Link href="/admin/settings" className="font-medium text-brand hover:underline">Check ARK settings</Link>
        </p>
      </>
    );
  }

  const names = new Map((result.clients.data?.rows ?? []).map((c) => [userIdOf(c)!, c]));
  const references = new Set(result.bivoraReferences);
  // Keep a copy of Bivora clients' rows, so each client's page shows them.
  await saveArkTransactions(result.rows, references);
  const tagged = result.rows.map((row) => ({ row, bivora: isBivoraTransaction(row, references) }));
  const shown = tagged.filter((t) => source === "all" || (source === "bivora") === t.bivora);

  const keep = { from, to, ...(type && { type: String(type) }), ...(source !== "all" && { source }), ...(demo && { demo: "1" }), ...(node && { node: String(node) }) };
  const olderHref = result.older ? `/admin/ark/money?${new URLSearchParams({ ...keep, before: String(result.older) })}` : null;

  return (
    <PendingArea>
      {header}
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
          <Field label="Made in">
            <Select name="source" defaultValue={source === "all" ? "" : source}>
              <option value="">Bivora and ARK</option>
              <option value="bivora">Bivora</option>
              <option value="ark">ARK directly</option>
            </Select>
          </Field>
          <Field label="Office or node ID">
            <Input name="node" inputMode="numeric" placeholder={`All (${result.top})`} defaultValue={node} />
          </Field>
          <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-3 lg:col-span-1 lg:flex-col lg:items-stretch">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="demo" value="1" defaultChecked={demo} className="size-4 accent-[var(--brand)]" />
              Include demo
            </label>
            <Button type="submit" variant="secondary">Apply</Button>
          </div>
        </PendingForm>
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          description={`${from} to ${to}, newest first${before ? ", older page" : ""}.`}
          action={before ? <PendingLink href={`/admin/ark/money?${new URLSearchParams(keep)}`} className={buttonClass("ghost")}>Newest</PendingLink> : undefined}
        />
        {result.clients.error && (
          <div className="px-4 pt-4 sm:px-5"><Alert tone="info">Client names couldn&apos;t be loaded: {result.clients.error}</Alert></div>
        )}
        {shown.length === 0 ? (
          <EmptyState title="No money transactions for these filters." />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map(({ row, bivora }, i) => {
              const userId = userIdOf({ userId: row.userId, userID: row.userID });
              const client = userId !== undefined ? accounts.get(userId) : undefined;
              const arkUser = userId !== undefined ? names.get(userId) : undefined;
              const typeId = transactionTypeOf(row);
              const amount = signed(row);
              const comment = typeof row.comment === "string" ? row.comment : typeof row.trxComment === "string" ? row.trxComment : "";
              const time = typeof row.transactionTime === "string" ? row.transactionTime : typeof row.trxDate === "string" ? row.trxDate : "";
              return (
                <li key={transactionIdOf(row) ?? i} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
                  <div className="min-w-0 flex-1 basis-60 [overflow-wrap:anywhere]">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{TRANSACTION_TYPES[typeId ?? 0] ?? `Type ${typeId ?? "?"}`}</span>
                      <Tag tone={bivora ? "brand" : undefined}>{bivora ? "Bivora" : "ARK"}</Tag>
                    </p>
                    <p className="mt-0.5">
                      {client ? (
                        <Link href={`/admin/users/${client.id}`} className="hover:text-brand">{client.name}</Link>
                      ) : (
                        nameOf(arkUser ?? {}) || `ARK user ${userId ?? "?"}`
                      )}
                      <span className="text-xs text-muted">
                        {" "}· User {userId ?? "—"} · Office {parentIdOf(row) ?? (arkUser && parentIdOf(arkUser)) ?? "—"}
                      </span>
                    </p>
                    {comment && <p className="text-xs text-muted">{comment}</p>}
                    {typeof row.requestReference === "string" && row.requestReference && (
                      <p className="font-mono text-xs text-muted">Ref {row.requestReference}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("font-mono font-medium tabular-nums", amount < 0 ? "text-down" : "text-up")}>
                      {amount < 0 ? "−" : "+"}{money(Math.abs(amount))}
                    </p>
                    <p className="text-xs text-muted">{time.slice(0, 16)}</p>
                    <p className="font-mono text-xs text-muted">#{transactionIdOf(row) ?? "—"}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {olderHref && (
          <div className="border-t border-line p-4 text-center sm:p-5">
            <PendingLink href={olderHref} className={buttonClass("secondary")}>Load older transactions</PendingLink>
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
  CHECK: { label: "Check in ARK", tone: "warn" },
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
  }[];
}) {
  if (rows.length === 0) return <EmptyState title="Nothing posted from here yet." />;
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
                {r.status === "DONE" && !r.emailSentAt && <Tag tone="warn">Email not sent</Tag>}
              </p>
              <p className="mt-0.5">
                <Link href={`/admin/users/${r.user.id}`} className="hover:text-brand">{r.user.firstName} {r.user.lastName}</Link>
                <span className="text-xs text-muted"> · by {r.admin.email} · {formatDate(r.createdAt)}</span>
              </p>
              {r.comment && <p className="text-xs text-muted">{r.comment}</p>}
              {r.error && r.status !== "DONE" && <p className="text-xs text-down">{r.error}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("font-mono font-medium tabular-nums", minus ? "text-down" : "text-up")}>
                {minus ? "−" : "+"}{money(Math.abs(amount))}
              </p>
              {r.arkTrxId && <p className="font-mono text-xs text-muted">#{r.arkTrxId}</p>}
              {(r.status === "FAILED" || r.status === "CHECK" || stuck) && <div className="mt-1"><RetryButton id={r.id} /></div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

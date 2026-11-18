import Link from "next/link";
import { Alert, ButtonLink, Card, CardHeader, EmptyState, cn } from "@/components/ui";
import { MANUAL_MONEY_TYPES } from "@/lib/ark/client";
import { TRANSACTION_TYPES, amountOf, arkTimeOf, getClientArkMoney, isBivoraTransaction, transactionIdOf, transactionTypeOf } from "@/lib/ark/reports";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Money out of the account; adjustments keep their own sign. */
const signed = (type: number, amount: number) => (type === 5 ? amount : type === 2 || type === 4 ? -Math.abs(amount) : Math.abs(amount));

type Row = { key: string; type: number; amount: number; tag: string; tone: "brand" | "warn" | "down" | "muted"; note: string | null; when: string; ref: string | null };

const STATUS: Record<string, { label: string; tone: Row["tone"] }> = {
  DONE: { label: "Bivora", tone: "brand" },
  FAILED: { label: "Failed", tone: "down" },
  CHECK: { label: "Not confirmed by ARK", tone: "warn" },
  PENDING: { label: "Sending…", tone: "warn" },
};

/**
 * Money on this client's trading account. "Made in Bivora" is Bivora's own records (no ARK call);
 * "ARK history" asks ARK for its full list, only when that tab is opened.
 */
export async function ArkMoneySection({ userId, arkUserId, tab }: { userId: string; arkUserId: string; tab: "bivora" | "ark" }) {
  const tabs = (
    <div className="flex gap-1 border-b border-line px-4 py-2 text-sm sm:px-5">
      {([["bivora", "Made in Bivora"], ["ark", "ARK history"]] as const).map(([value, label]) => (
        <Link
          key={value}
          href={`/admin/users/${userId}${value === "ark" ? "?money=ark" : ""}#money`}
          scroll={false}
          className={cn("rounded-lg px-2.5 py-1", tab === value ? "bg-surface-2 font-medium" : "text-muted hover:text-foreground")}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  let rows: Row[] = [];
  let error: string | null = null;
  let unsent = 0;
  if (tab === "bivora") {
    const [manual, approved] = await Promise.all([
      db.arkMoneyTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.fundRequest.findMany({ where: { userId, status: "APPROVED" }, orderBy: { reviewedAt: "desc" }, take: 100 }),
    ]);
    unsent = manual.filter((m) => m.status !== "DONE").length;
    rows = [
      ...manual.map((m) => {
        const status = STATUS[m.status] ?? { label: m.status, tone: "muted" as const };
        return { key: m.id, type: m.type, amount: Number(m.amount), tag: status.label, tone: status.tone, note: m.comment, when: formatDate(m.createdAt), ref: m.arkTrxId, at: m.createdAt.getTime() };
      }),
      ...approved.map((r) => ({
        key: r.id,
        type: r.type === "DEPOSIT" ? 1 : 2,
        amount: Number(r.amount),
        tag: "Approved request",
        tone: "brand" as const,
        note: r.adminNote ?? r.userNote,
        when: formatDate(r.reviewedAt ?? r.createdAt),
        ref: r.arkTrxId,
        at: (r.reviewedAt ?? r.createdAt).getTime(),
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 100);
  } else {
    const result = await getClientArkMoney(arkUserId);
    if ("error" in result) error = result.error;
    else {
      const refs = new Set(result.references);
      rows = result.rows.map((r, i) => {
        const bivora = isBivoraTransaction(r, refs);
        const comment = typeof r.comment === "string" ? r.comment : typeof r.trxComment === "string" ? r.trxComment : null;
        return {
          key: String(transactionIdOf(r) ?? i),
          type: transactionTypeOf(r) ?? 0,
          amount: amountOf(r),
          tag: bivora ? "Bivora" : "ARK",
          tone: bivora ? ("brand" as const) : ("muted" as const),
          note: comment,
          when: arkTimeOf(r).slice(0, 16),
          ref: transactionIdOf(r) != null ? String(transactionIdOf(r)) : null,
        };
      });
    }
  }

  return (
    <Card id="money" className="mt-6 min-w-0 scroll-mt-20">
      <CardHeader
        title="Trading account money"
        description={tab === "bivora" ? "Money transactions made in Bivora and approved requests, from Bivora's records." : "Every money transaction ARK has on this account, newest first."}
        action={<ButtonLink href={`/admin/ark/money?client=${encodeURIComponent(userId)}#new`} variant="secondary">Add money transaction</ButtonLink>}
      />
      {tabs}
      {error && (
        <div className="px-4 pt-4 sm:px-5">
          <Alert tone="error">Couldn&apos;t get ARK&apos;s list: {error}</Alert>
        </div>
      )}
      {unsent > 0 && (
        <p className="border-b border-line px-4 py-3 text-xs text-warning sm:px-5">
          {unsent} transaction{unsent === 1 ? "" : "s"} didn&apos;t reach ARK.{" "}
          <Link href="/admin/ark/money" className="font-medium underline">Retry on Money flow</Link>
        </p>
      )}
      {rows.length === 0 && !error ? (
        <EmptyState title={tab === "bivora" ? "No money transactions made in Bivora yet." : "ARK has no money transactions on this account."} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const amount = signed(r.type, r.amount);
            return (
              <li key={r.key} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <div className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{MANUAL_MONEY_TYPES[r.type as keyof typeof MANUAL_MONEY_TYPES] ?? TRANSACTION_TYPES[r.type] ?? `Type ${r.type}`}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        r.tone === "brand" ? "bg-brand/15 text-brand" : r.tone === "warn" ? "bg-warning/15 text-warning" : r.tone === "down" ? "bg-down/15 text-down" : "bg-line text-muted",
                      )}
                    >
                      {r.tag}
                    </span>
                  </p>
                  {r.note && <p className="text-xs text-muted">{r.note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-mono font-medium tabular-nums", amount < 0 ? "text-down" : "text-up")}>
                    {amount < 0 ? "−" : "+"}{money(Math.abs(amount))}
                  </p>
                  <p className="text-xs text-muted">{r.when}{r.ref ? ` · #${r.ref}` : ""}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function ArkMoneySectionLoading() {
  return (
    <Card className="mt-6" aria-busy>
      <CardHeader title="Trading account money" description="Loading…" />
      <div className="space-y-3 p-4 sm:p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-surface-2" />
        ))}
      </div>
    </Card>
  );
}

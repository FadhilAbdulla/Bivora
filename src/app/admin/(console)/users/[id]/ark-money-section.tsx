import Link from "next/link";
import { Alert, ButtonLink, Card, CardHeader, EmptyState, cn } from "@/components/ui";
import { TRANSACTION_TYPES, syncClientArkMoney } from "@/lib/ark/reports";
import { db } from "@/lib/db";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Money out of the account; adjustments keep their own sign. */
const signed = (type: number, amount: number) => (type === 5 ? amount : type === 2 || type === 4 ? -Math.abs(amount) : Math.abs(amount));

/** Every ARK money transaction on this client's account, made in Bivora or in ARK. */
export async function ArkMoneySection({ userId, arkUserId }: { userId: string; arkUserId: string }) {
  // Brings in anything new from ARK first (cached briefly), then shows Bivora's copy.
  const sync = await syncClientArkMoney(arkUserId);
  const [rows, unsent] = await Promise.all([
    db.arkTransaction.findMany({ where: { userId }, orderBy: [{ time: "desc" }, { id: "desc" }], take: 100 }),
    db.arkMoneyTransaction.findMany({ where: { userId, status: { not: "DONE" } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <Card className="mt-6 min-w-0">
      <CardHeader
        title="Trading account money"
        description="Deposits, withdrawals, credit and bonuses on the ARK account, made in Bivora or in ARK."
        action={<ButtonLink href={`/admin/ark/money?client=${encodeURIComponent(userId)}#new`} variant="secondary">Add money transaction</ButtonLink>}
      />
      {sync.error && (
        <div className="px-4 pt-4 sm:px-5">
          <Alert tone="info">Couldn&apos;t get the latest from ARK ({sync.error}). Showing what Bivora has saved.</Alert>
        </div>
      )}
      {unsent.length > 0 && (
        <p className="border-b border-line px-4 py-3 text-xs text-warning sm:px-5">
          {unsent.length} transaction{unsent.length === 1 ? "" : "s"} from Bivora didn&apos;t reach ARK.{" "}
          <Link href="/admin/ark/money" className="font-medium underline">Retry on Money flow</Link>
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No money transactions on this ARK account yet." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const amount = signed(r.type, Number(r.amount));
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <div className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{TRANSACTION_TYPES[r.type] ?? `Type ${r.type}`}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", r.madeInBivora ? "bg-brand/15 text-brand" : "bg-line text-muted")}>
                      {r.madeInBivora ? "Bivora" : "ARK"}
                    </span>
                  </p>
                  {r.comment && <p className="text-xs text-muted">{r.comment}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-mono font-medium tabular-nums", amount < 0 ? "text-down" : "text-up")}>
                    {amount < 0 ? "−" : "+"}{money(Math.abs(amount))}
                  </p>
                  <p className="text-xs text-muted">{r.time.slice(0, 16)} · #{r.id}</p>
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
      <CardHeader title="Trading account money" description="Getting the latest from ARK…" />
      <div className="space-y-3 p-4 sm:p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-surface-2" />
        ))}
      </div>
    </Card>
  );
}

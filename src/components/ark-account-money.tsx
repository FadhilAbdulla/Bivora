import { Card, CardHeader, EmptyState, cn } from "@/components/ui";
import { TRANSACTION_TYPES, syncClientArkMoney } from "@/lib/ark/reports";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

/** Deposits, withdrawals, credit and bonuses on the trading account. ARK's internal comments stay hidden. */
export async function AccountMoney({ userId, arkUserId, currency }: { userId: string; arkUserId: string; currency: string }) {
  await syncClientArkMoney(arkUserId);
  const rows = await db.arkTransaction.findMany({ where: { userId }, orderBy: [{ time: "desc" }, { id: "desc" }], take: 50 });
  return (
    <Card className="min-w-0">
      <CardHeader title="Account money" description="Deposits, withdrawals, credit and bonuses on your trading account." />
      {rows.length === 0 ? (
        <EmptyState title="No money movements yet." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const amount = Number(r.amount);
            const out = r.type === 2 || r.type === 4 || (r.type === 5 && amount < 0);
            return (
              <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                <div>
                  <p className="font-medium">{TRANSACTION_TYPES[r.type] ?? "Transaction"}</p>
                  <p className="text-xs text-muted">{r.time.slice(0, 16)}</p>
                </div>
                <p className={cn("shrink-0 font-mono font-medium tabular-nums", out ? "text-down" : "text-up")}>
                  {out ? "−" : "+"}{formatMoney(Math.abs(amount), currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

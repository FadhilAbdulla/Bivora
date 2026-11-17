import type { Metadata } from "next";
import { ArkPendingNotice } from "@/components/ark-pending";
import { TradingFinancials } from "@/components/trading-financials";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { tradingAccountsOf } from "@/lib/trading-accounts";

export const metadata: Metadata = { title: "Trading account" };

/** Each trading account's financial standing. The page renders at once; the figures load from ARK in the browser. */
export default async function TradingPage() {
  const user = await requireUser();
  const accounts = tradingAccountsOf(user);

  return (
    <>
      <PageHeader
        title={accounts.length > 1 ? "Trading accounts" : "Trading account"}
        description="The financial standing of your trading account on our trading platform."
      />
      {accounts.length === 0 ? (
        <ArkPendingNotice />
      ) : (
        <div className="grid gap-4">
          {accounts.map((a) => (
            <TradingFinancials key={a.arkUserId} account={a} currency={user.currency} detailed />
          ))}
        </div>
      )}
    </>
  );
}

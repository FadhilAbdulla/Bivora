import type { User } from "@prisma/client";

export type TradingAccount = {
  /** ARK's user ID: what ARK's financial standing endpoint takes. */
  arkUserId: string;
  username: string | null;
  accountId: string | null;
  demo: boolean;
  label: string;
};

/**
 * Every trading account the client has. Today that's their one ARK account; when clients can hold
 * more, add them here and the dashboard and trading pages list each one.
 */
export function tradingAccountsOf(user: Pick<User, "arkUserId" | "arkUsername" | "arkAccountId" | "arkIsDemo">): TradingAccount[] {
  if (!user.arkUserId) return [];
  const name = user.arkUsername ?? (user.arkAccountId ? `Account ${user.arkAccountId}` : "Trading account");
  return [
    {
      arkUserId: user.arkUserId,
      username: user.arkUsername,
      accountId: user.arkAccountId,
      demo: user.arkIsDemo,
      label: `${name} · ${user.arkIsDemo ? "Demo" : "Real"}`,
    },
  ];
}

import "server-only";

// ARK trader integration — PENDING.
//
// Everything the app needs from ARK goes through this module, so wiring up the
// real API only means implementing these functions against the ARK endpoints.
// Until then `isArkConnected()` returns false and the UI shows a pending state.
// Endpoint reference: docs/ark-api.md

export type ArkAccountSummary = {
  accountId: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null;
  leverage: number;
  currency: string;
};

export type ArkPosition = {
  ticket: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  openedAt: Date;
};

export type ArkClosedTrade = ArkPosition & {
  closePrice: number;
  closedAt: Date;
};

export class ArkNotConnectedError extends Error {
  constructor() {
    super("ARK trader integration is not connected yet");
  }
}

export function isArkConnected() {
  // TODO(ark): return true once the client below is implemented.
  return false;
}

// TODO(ark): POST /admin/public/api/v2/user (Create Client).
export async function createTradingAccount(_user: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  throw new ArkNotConnectedError();
}

// TODO(ark): GET /trading/public/api/v2/userFinancials/{userId} (Financial Standing).
export async function getAccountSummary(
  _accountId: string,
): Promise<ArkAccountSummary> {
  throw new ArkNotConnectedError();
}

// TODO(ark): GET /trading/public/api/v2/report/open/positions/{userId}/0.
export async function getOpenPositions(_accountId: string): Promise<ArkPosition[]> {
  throw new ArkNotConnectedError();
}

// TODO(ark): GET /admin/public/api/v2/report/closed/positions/{userId}.
export async function getTradeHistory(
  _accountId: string,
): Promise<ArkClosedTrade[]> {
  throw new ArkNotConnectedError();
}

// TODO(ark): POST /admin/public/api/v2/money/transaction with trxType 1 (deposit)
// or 2 (withdraw) and the FundRequest id as requestReference.
// Called from approveFundRequest().
export async function applyBalanceOperation(_op: {
  accountId: string;
  amount: number;
  comment: string;
}): Promise<void> {
  throw new ArkNotConnectedError();
}

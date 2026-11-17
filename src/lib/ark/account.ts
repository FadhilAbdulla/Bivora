import "server-only";
import { ArkError, arkRequest, loadArkConfig } from "./client";

// The one thing clients see from ARK: each trading account's financial standing
// (GET /trading/public/api/v2/userFinancials/{userId}). Fetched live on every request, never from
// a stored copy, so a client never sees an old balance. ARK's docs give no response example, so
// each value is read from the field names ARK is known to use, and the first reply's field names
// are logged (names only, never values) to check against the real data.

type Row = Record<string, unknown>;

export type ArkSummary = {
  balance?: number;
  equity?: number;
  credit?: number;
  bonus?: number;
  deposits?: number;
  withdrawals?: number;
  closedProfit?: number;
  margin?: number;
  freeMargin?: number;
  marginLevel?: number;
  profit?: number;
};

export type ArkFinancials = { error: string } | { summary: ArkSummary | null };

function num(row: Row, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/** ARK's reply is the row itself, or the row wrapped in a list or a `data`-style field. */
function firstRow(data: unknown): Row | undefined {
  if (Array.isArray(data)) return data.find((r): r is Row => typeof r === "object" && r !== null);
  if (data && typeof data === "object") {
    for (const key of ["content", "data", "rows", "list", "items"]) {
      const inner = (data as Row)[key];
      if (inner && typeof inner === "object") return firstRow(inner);
    }
    return data as Row;
  }
  return undefined;
}

let logged = false;

function summaryOf(data: unknown): ArkSummary | null {
  const row = firstRow(data);
  if (!row) return null;
  if (!logged) {
    logged = true;
    console.info("ARK financial standing fields:", Object.keys(row).join(","));
  }
  return {
    balance: num(row, ["balance", "accountBalance"]),
    equity: num(row, ["equity"]),
    credit: num(row, ["credit"]),
    bonus: num(row, ["bonus"]),
    deposits: num(row, ["totalDeposits"]),
    withdrawals: num(row, ["totalWithdrawals"]),
    closedProfit: num(row, ["totalCloseProfit"]),
    margin: num(row, ["usedMargin", "margin", "marginUsed"]),
    freeMargin: num(row, ["freeMargin", "marginFree"]),
    marginLevel: num(row, ["marginLevel"]),
    profit: num(row, ["currentPL", "floatingPL", "floatingPl", "profitLoss", "pl", "netPL"]),
  };
}

/** One trading account's financial standing, straight from ARK. */
export async function fetchArkFinancials(arkUserId: string): Promise<ArkFinancials> {
  try {
    const config = await loadArkConfig();
    const result = await arkRequest<unknown>(config, `/trading/public/api/v2/userFinancials/${encodeURIComponent(arkUserId)}`, { method: "GET" });
    if (!result.ok) return { error: result.message || `ARK returned ${result.status}.` };
    return { summary: summaryOf(result.data) };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
}

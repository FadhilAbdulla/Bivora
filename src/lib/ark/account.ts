import "server-only";
import { arkCached } from "./cache";
import { ArkError, arkRequest, loadArkConfig, type ArkConfig } from "./client";

// Read-only views of one client's own ARK account for the client dashboard: financial standing,
// open positions and closed trades. ARK's docs give no response examples for these, so each value
// is read from the field names ARK is known to use, and the first reply's field names are logged
// (names only, never values) to check against the real data.

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

export type ArkTrade = {
  ticket: string;
  symbol: string;
  side: "Buy" | "Sell" | "";
  volume?: number;
  commission?: number;
  openPrice?: number;
  currentPrice?: number;
  closePrice?: number;
  profit?: number;
  openedAt: string;
  closedAt: string;
};

export type ArkClientAccount =
  | { error: string }
  | { summary: ArkSummary | null; open: ArkTrade[]; closed: ArkTrade[]; partial?: string };

function num(row: Row | undefined, keys: string[]) {
  for (const key of keys) {
    const v = row?.[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function text(row: Row, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function rows(data: unknown): Row[] {
  if (Array.isArray(data)) return data.filter((r): r is Row => typeof r === "object" && r !== null);
  if (data && typeof data === "object") {
    for (const key of ["content", "data", "rows", "list", "items", "positions"]) {
      const inner = (data as Row)[key];
      if (Array.isArray(inner)) return rows(inner);
    }
    return [data as Row];
  }
  return [];
}

const logged = new Set<string>();
function logShape(what: string, row: Row | undefined) {
  if (!row || logged.has(what)) return;
  logged.add(what);
  console.info(`ARK ${what} fields:`, Object.keys(row).join(","));
}

/** ARK's date format: server local time, yyyy-MM-dd HH:mm:ss. */
function arkDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const time = (row: Row, keys: string[]) => text(row, keys).slice(0, 16).replace("T", " ");

/** ARK sends instruments by ID (posCurrencyID); `symbols` maps them to names. */
function trade(row: Row, symbols: Map<number, string>): ArkTrade {
  const side = num(row, ["posType", "buySell", "positionType", "positionTypeId", "type", "side"]);
  const symbolId = num(row, ["posCurrencyID", "currencyID", "currencyId", "scriptId"]);
  const sideText = text(row, ["buySellName", "side", "direction"]).toLowerCase();
  return {
    ticket: text(row, ["ticketID", "ticketId", "id", "positionId", "orderId"]),
    symbol: text(row, ["currencyName", "symbol", "scriptName", "instrument"]) || (symbolId !== undefined ? symbols.get(symbolId) ?? `#${symbolId}` : ""),
    side: side === 1 || sideText.startsWith("b") ? "Buy" : side === 2 || sideText.startsWith("s") ? "Sell" : "",
    volume: num(row, ["openAmount", "amount", "volume", "lots", "lot", "quantity", "qty"]),
    commission: num(row, ["openCommission", "commission"]),
    openPrice: num(row, ["posPrice", "openPrice", "entryPrice", "initialPrice", "price"]),
    currentPrice: num(row, ["currentPrice", "marketPrice", "lastPrice", "closePrice"]),
    closePrice: num(row, ["closePrice", "exitPrice"]),
    profit: num(row, ["profitLoss", "netProfit", "profit", "pl", "floatingPL", "floatingPl"]),
    openedAt: time(row, ["posDate", "openDate", "initialDate", "openTime", "openDateTime", "createdDate", "date"]),
    closedAt: time(row, ["closeDate", "closeTime", "closeDateTime"]),
  };
}

async function get(config: ArkConfig, path: string) {
  const result = await arkRequest<unknown>(config, path, { method: "GET" });
  if (!result.ok) throw new ArkError(result.message || `ARK returned ${result.status}.`);
  return result.data;
}

async function load(arkUserId: string): Promise<ArkClientAccount> {
  let config: ArkConfig;
  try {
    config = await loadArkConfig();
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const id = encodeURIComponent(arkUserId);
  const now = new Date();
  const range = (days: number) =>
    new URLSearchParams({
      fromDate: arkDate(new Date(now.getTime() - days * 86_400_000)),
      toDate: arkDate(new Date(now.getTime() + 86_400_000)),
      withDemo: "true",
      limit: "200",
    });
  // Each part on its own, so one refusal doesn't hide the rest.
  const [summary, open, closed, symbols] = await Promise.allSettled([
    get(config, `/trading/public/api/v2/userFinancials/${id}`),
    get(config, `/trading/public/api/v2/report/open/positions/${id}/0?${range(3650)}`),
    get(config, `/admin/public/api/v2/report/closed/positions/${id}?${range(90)}`),
    getSymbols(),
  ]);
  const names = symbols.status === "fulfilled" ? new Map(symbols.value) : new Map<number, string>();
  const failed = [summary, open, closed].find((r) => r.status === "rejected");
  if (summary.status === "rejected" && open.status === "rejected" && closed.status === "rejected") {
    const reason = summary.reason;
    if (reason instanceof ArkError) return { error: reason.message };
    throw reason;
  }

  let s: ArkSummary | null = null;
  if (summary.status === "fulfilled") {
    const row = rows(summary.value)[0];
    logShape("financial standing", row);
    if (row) {
      s = {
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
  }
  const openRows = open.status === "fulfilled" ? rows(open.value).filter((r) => Object.keys(r).length > 0) : [];
  const closedRows = closed.status === "fulfilled" ? rows(closed.value).filter((r) => Object.keys(r).length > 0) : [];
  logShape("open position", openRows[0]);
  logShape("closed position", closedRows[0]);
  return {
    summary: s,
    open: openRows.map((r) => trade(r, names)),
    closed: closedRows.map((r) => trade(r, names)),
    ...(failed?.status === "rejected" && { partial: failed.reason instanceof ArkError ? failed.reason.message : "Part of your account couldn't be loaded." }),
  };
}

/** Instrument names by ARK ID ([id, name] pairs, so the cache can store them). */
async function loadSymbols(): Promise<[number, string][] | { error: string }> {
  try {
    const config = await loadArkConfig();
    const list = rows(await get(config, "/admin/public/api/v2/currency"));
    logShape("script", list[0]);
    return list.flatMap((r) => {
      const id = num(r, ["id", "currencyID", "currencyId"]);
      const name = text(r, ["currencyName", "name", "symbol", "code", "description"]);
      return id !== undefined && name && num(r, ["currencyTypeId"]) !== 2 ? [[id, name] as [number, string]] : [];
    });
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
}

async function getSymbols() {
  const result = await arkCached("symbols", null, loadSymbols);
  if (!Array.isArray(result)) throw new ArkError(result.error);
  return result;
}

/** The client's own ARK account; the last reply is shown at once and refreshed in the background. */
export function getClientArkAccount(arkUserId: string) {
  return arkCached("clientAccount", arkUserId, () => load(arkUserId));
}

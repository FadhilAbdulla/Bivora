import "server-only";
import { db } from "../db";
import { ArkError, arkRequest, ensureArkSession, loadArkConfig, type ArkConfig } from "./client";

// Read-only ARK reports for the admin console: offices, clients and their financial standing.
// ARK's docs give no response examples for these, so rows are kept as ARK sends them and the
// page shows whatever columns come back. Endpoint reference: docs/ark-api.md

export type ArkRow = Record<string, unknown>;
type Section<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

const USER_TYPE = { client: 1, office: 2 } as const;
const PAGE_SIZE = 500;
const MAX_PAGES = 20;

function pick(row: ArkRow | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

export const userIdOf = (row: ArkRow) => pick(row, ["userID", "userId", "id"]);
export const parentIdOf = (row: ArkRow) => pick(row, ["parentId", "parentID", "userParentId"]);
export const accountIdOf = (row: ArkRow) => pick(row, ["accountID", "accountId"]);
const userTypeOf = (row: ArkRow) => pick(row, ["userType", "userTypeId"]);

export function isDemo(row: ArkRow) {
  return row.isDemo === true || row.demo === true;
}

export function nameOf(row: ArkRow) {
  const name = [row.firstName, row.lastName].filter((v) => typeof v === "string" && v.trim()).join(" ");
  return name || (typeof row.username === "string" ? row.username : "");
}

/** ARK's date format: local server time, `yyyy-MM-dd HH:mm:ss`. */
function arkDate(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

function rowsOf(data: unknown): ArkRow[] {
  if (Array.isArray(data)) return data.filter((r): r is ArkRow => typeof r === "object" && r !== null);
  // Some ARK reports wrap the list.
  if (data && typeof data === "object") {
    for (const key of ["content", "data", "rows", "list", "items", "users", "user"]) {
      const inner = (data as ArkRow)[key];
      if (Array.isArray(inner)) return rowsOf(inner);
    }
    return [data as ArkRow];
  }
  return [];
}

async function get(config: ArkConfig, path: string) {
  const result = await arkRequest<unknown>(config, path, { method: "GET" });
  if (!result.ok) throw new ArkError(result.message || `ARK returned ${result.status}.`);
  return result.data;
}

/** The highest node the dealer can see: walk up from the dealer's own account. */
async function findTopNode(config: ArkConfig) {
  const dealer = rowsOf(
    await get(config, `/admin/public/api/v2/username/${encodeURIComponent(config.dealerUsername)}`).catch(() => null),
  )[0];
  let id = dealer ? userIdOf(dealer) : undefined;
  let start = dealer;
  if (id === undefined) {
    // No access to the dealer's own record: climb from the saved office instead of stopping there.
    id = config.parentId;
    start = rowsOf(await get(config, `/admin/public/api/v2/user/${id}`).catch(() => null))[0];
    if (!start) return id;
  }
  let parent = parentIdOf(start);
  for (let i = 0; i < 10 && parent && parent > 0 && parent !== id; i++) {
    const row = rowsOf(await get(config, `/admin/public/api/v2/user/${parent}`).catch(() => null))[0];
    if (!row) break;
    id = parent;
    parent = parentIdOf(row);
  }
  return id;
}

/** Every user of one type under a node. ARK pages differ by report, so pages are merged by user ID. */
async function listUsers(config: ArkConfig, node: number, userTypeId: number) {
  const byId = new Map<number, ArkRow>();
  const tomorrow = new Date(Date.now() + 86_400_000);
  let capped = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({
      fromDate: "2000-01-01 00:00:00",
      toDate: arkDate(tomorrow),
      withDemo: "true",
      userTypeId: String(userTypeId),
      limit: String(PAGE_SIZE),
      ...(page > 0 && { offset: String(page * PAGE_SIZE) }),
    });
    const rows = rowsOf(await get(config, `/admin/public/api/v2/report/users/details/${node}?${query}`));
    const before = byId.size;
    for (const row of rows) {
      const id = userIdOf(row);
      const type = userTypeOf(row);
      if (id !== undefined && (type === undefined || type === userTypeId)) byId.set(id, row);
    }
    if (rows.length < PAGE_SIZE || byId.size === before) break;
    if (page === MAX_PAGES - 1) capped = true;
  }
  return { rows: [...byId.values()], capped };
}

async function financials(config: ArkConfig, node: number) {
  const query = new URLSearchParams({ userIds: String(node), withDemo: "false" });
  return rowsOf(await get(config, `/financialStandings/public/api/v2/userFinancials?${query}`));
}

async function section<T>(work: () => Promise<T>): Promise<Section<T>> {
  try {
    return { data: await work() };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    console.error("ARK report failed", e instanceof Error ? e.message : "");
    return { error: "ARK sent a reply Bivora couldn't read." };
  }
}

export type ArkOverview =
  | { error: string }
  | {
      top: number;
      node: number;
      /** ARK's own record for the node, for its name. */
      nodeInfo: ArkRow | null;
      offices: Section<{ rows: ArkRow[]; capped: boolean }>;
      clients: Section<{ rows: ArkRow[]; capped: boolean }>;
      financials: Section<ArkRow[]>;
    };

export async function getArkOverview(requestedNode?: number): Promise<ArkOverview> {
  let config: ArkConfig;
  let top: number;
  try {
    config = await loadArkConfig();
    // Signs in if there is no session yet, so a login error shows once instead of per report.
    await ensureArkSession(config);
    top = await findTopNode(config);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const node = requestedNode ?? top;
  const [nodeInfo, offices, clients, standing] = await Promise.all([
    get(config, `/admin/public/api/v2/user/${node}`).then((d) => rowsOf(d)[0] ?? null, () => null),
    section(() => listUsers(config, node, USER_TYPE.office)),
    section(() => listUsers(config, node, USER_TYPE.client)),
    section(() => financials(config, node)),
  ]);
  return { top, node, nodeInfo, offices, clients, financials: standing };
}

// ---------- TEMPORARY: find the office ID from its username ----------

const usernameOf = (row: ArkRow) =>
  [row.username, row.userName, row.login].find((v): v is string => typeof v === "string") ?? "";

/** ARK sends the type as a number, a numeric string or a label. */
function typeOf(row: ArkRow) {
  const n = userTypeOf(row);
  if (n !== undefined) return n;
  const label = [row.userType, row.userTypeName, row.type].find((v): v is string => typeof v === "string") ?? "";
  if (/office/i.test(label)) return 2;
  if (/client/i.test(label)) return 1;
  if (/dealer/i.test(label)) return 3;
  if (/department/i.test(label)) return 4;
  return undefined;
}

const TYPE_NAMES: Record<number, string> = { 1: "a client", 2: "an office", 3: "a dealer", 4: "a department" };

/**
 * The office ID for an ARK username. Tries ARK's username lookup, then searches every office under the
 * dealer's top node (some dealer policies refuse the direct lookup). A dealer or department name resolves
 * to the office above it.
 */
export async function findArkOffice(username: string): Promise<{ officeId: number; note: string }> {
  const config = await loadArkConfig();
  await ensureArkSession(config);
  const wanted = username.trim().toLowerCase();
  const matches = (row: ArkRow) => usernameOf(row).toLowerCase() === wanted;

  const direct = await arkRequest<unknown>(config, `/admin/public/api/v2/username/${encodeURIComponent(username.trim())}`, { method: "GET" });
  const directRows = direct.ok ? rowsOf(direct.data).filter((r) => userIdOf(r) !== undefined) : [];
  let user: ArkRow | undefined = directRows.find(matches) ?? (directRows.length === 1 ? directRows[0] : undefined);

  let searchError = "";
  if (!user) {
    try {
      // Search the whole tree, not just the saved office: from the highest node the dealer can reach,
      // then ARK's root node 1 in case the dealer can see more from there.
      const top = await findTopNode(config);
      for (const root of [...new Set([top, 1])]) {
        const self = rowsOf(await get(config, `/admin/public/api/v2/user/${root}`).catch(() => null))[0];
        if (self && matches(self)) { user = self; break; }
        const offices = await listUsers(config, root, USER_TYPE.office).catch(() => null);
        user = offices?.rows.find(matches);
        if (user) break;
      }
    } catch (e) {
      searchError = e instanceof ArkError ? e.message : "the office search failed";
    }
  }

  if (!user) {
    const said = direct.ok ? "" : ` ARK said: "${direct.message || `error ${direct.status}`}".`;
    throw new ArkError(
      `No ARK office with the username "${username}" was found.${said}${searchError ? ` Office search: ${searchError}.` : ""} Check the spelling, or ask the broker whether this dealer can see that office.`,
    );
  }

  let type = typeOf(user);
  let id = userIdOf(user)!;
  if (type === 1) throw new ArkError(`"${username}" is a client account in ARK (user ${id}), not an office.`);
  let note = "";
  if (type === 3 || type === 4) {
    // Walk up to the nearest office.
    let row: ArkRow | undefined = user;
    for (let i = 0; i < 10 && row && type !== 2; i++) {
      const parent = parentIdOf(row);
      if (!parent || parent <= 0 || parent === id) break;
      row = rowsOf(await get(config, `/admin/public/api/v2/user/${parent}`).catch(() => null))[0];
      if (!row) break;
      id = parent;
      type = typeOf(row);
    }
    if (type !== 2) throw new ArkError(`"${username}" is ${TYPE_NAMES[typeOf(user)!]} in ARK and no office was found above it.`);
    note = ` "${username}" is ${TYPE_NAMES[typeOf(user)!]}; this is the office it belongs to${row && nameOf(row) ? ` (${nameOf(row)})` : ""}.`;
  }
  return { officeId: id, note };
}

// ---------- Where an account or transaction came from ----------

export type BivoraClient = { id: string; name: string; email: string };

/** ARK user ID → the Bivora client whose approval opened it. Everything else was opened in ARK. */
export async function bivoraAccounts() {
  const users = await db.user.findMany({
    where: { arkUserId: { not: null } },
    select: { id: true, arkUserId: true, firstName: true, lastName: true, email: true },
  });
  return new Map(users.map((u) => [Number(u.arkUserId), { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email }]));
}

/** Matches Bivora's own fields first, then the marker Bivora puts in ARK (customData.bivoraUserId). */
export function bivoraClientFor(row: ArkRow, accounts: Map<number, BivoraClient>) {
  const id = userIdOf(row);
  if (id !== undefined && accounts.has(id)) return accounts.get(id)!;
  const custom = row.customData;
  if (custom && typeof custom === "object" && typeof (custom as ArkRow).bivoraUserId === "string") {
    return { id: (custom as ArkRow).bivoraUserId as string, name: nameOf(row), email: "" };
  }
  return null;
}

// ---------- Money transactions ----------

export const TRANSACTION_TYPES: Record<number, string> = {
  1: "Deposit",
  2: "Withdrawal",
  3: "Credit in",
  4: "Credit out",
  5: "Adjustment",
  6: "Bonus",
};
const MONEY_PAGE = 200;

export type MoneyFilters = {
  node?: number;
  /** yyyy-MM-dd, inclusive. */
  from: string;
  to: string;
  type?: number;
  demo: boolean;
  /** ARK pages this report by transaction ID: only IDs below this one. */
  before?: number;
};

export type ArkMoney =
  | { error: string }
  | {
      top: number;
      node: number;
      rows: ArkRow[];
      /** Pass as `before` for the next, older page; undefined when this is the last. */
      older?: number;
      clients: Section<{ rows: ArkRow[]; capped: boolean }>;
      /** FundRequest IDs Bivora sent to ARK as requestReference. */
      bivoraReferences: Set<string>;
    };

export async function getArkMoney(filters: MoneyFilters): Promise<ArkMoney> {
  let config: ArkConfig;
  let top: number;
  try {
    config = await loadArkConfig();
    await ensureArkSession(config);
    top = await findTopNode(config);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const node = filters.node ?? top;
  const query = new URLSearchParams({
    fromDate: `${filters.from} 00:00:00`,
    toDate: `${filters.to} 23:59:59`,
    withDemo: String(filters.demo),
    limit: String(MONEY_PAGE),
    ...(filters.type && { transactionTypeId: String(filters.type) }),
    ...(filters.before && { offset: String(filters.before) }),
  });
  const [money, clients] = await Promise.all([
    section(async () => rowsOf(await get(config, `/admin/public/api/v2/report/money/transaction/${node}?${query}`))),
    section(() => listUsers(config, node, USER_TYPE.client)),
  ]);
  if (money.error !== undefined) return { error: money.error };
  const rows = money.data;

  const references = [...new Set(rows.map((r) => r.requestReference).filter((v): v is string => typeof v === "string" && v !== ""))];
  const known = references.length
    ? await db.fundRequest.findMany({ where: { id: { in: references } }, select: { id: true } })
    : [];
  const ids = rows.map((r) => pick(r, ["id", "trxId"])).filter((v): v is number => v !== undefined);
  return {
    top,
    node,
    rows,
    older: rows.length === MONEY_PAGE && ids.length ? Math.min(...ids) : undefined,
    clients,
    bivoraReferences: new Set(known.map((k) => k.id)),
  };
}

/** Bivora posts money with its FundRequest ID as requestReference and a comment starting "Bivora". */
export function isBivoraTransaction(row: ArkRow, references: Set<string>) {
  const ref = typeof row.requestReference === "string" ? row.requestReference : "";
  const comment = typeof row.comment === "string" ? row.comment : typeof row.trxComment === "string" ? row.trxComment : "";
  return references.has(ref) || /^bivora\b/i.test(comment);
}

export const transactionIdOf = (row: ArkRow) => pick(row, ["id", "trxId"]);
export const amountOf = (row: ArkRow) => pick(row, ["amount", "trxAmount"]) ?? 0;
export const transactionTypeOf = (row: ArkRow) => pick(row, ["transactionTypeId", "trxType", "trxTypeId"]);


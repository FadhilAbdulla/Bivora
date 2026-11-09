import "server-only";
import { db } from "../db";
import { arkCached } from "./cache";
import { ArkError, arkRequest, ensureArkSession, loadArkConfig, type ArkConfig } from "./client";

// Read-only ARK reports for the admin console: client accounts, money transactions and settings lists.
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
      /** ARK's own record for the top node, for its name. */
      topInfo: ArkRow | null;
      /** Offices under the top node, to switch between. */
      offices: ArkChoice[];
      clients: Section<{ rows: ArkRow[]; capped: boolean }>;
    };

/**
 * Client accounts under one office. With no office asked for, it opens on the office new clients
 * are created in (ARK settings), or everything under the top node when that office isn't listed.
 */
async function loadArkOverview(requestedNode?: number): Promise<ArkOverview> {
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
  const [topInfo, officeList] = await Promise.all([
    get(config, `/admin/public/api/v2/user/${top}`).then((d) => rowsOf(d)[0] ?? null, () => null),
    listUsers(config, top, USER_TYPE.office).catch(() => null),
  ]);
  const offices = (officeList?.rows ?? [])
    .filter((r) => userIdOf(r) !== top)
    .map(officeChoice)
    .sort((a, b) => a.label.localeCompare(b.label));
  const node = requestedNode ?? (offices.some((o) => o.id === config.parentId) ? config.parentId : top);
  const clients = await section(() => listUsers(config, node, USER_TYPE.client));
  return { top, node, topInfo, offices, clients };
}

// ---------- Choices for ARK settings ----------

export type ArkChoice = { id: number; label: string; group?: string };
export type ArkChoices = {
  offices: Section<ArkChoice[]>;
  genericPolicies: Section<ArkChoice[]>;
  scriptPolicies: Section<ArkChoice[]>;
};

const textOf = (row: ArkRow, keys: string[]) =>
  keys.map((k) => row[k]).find((v): v is string => typeof v === "string" && v.trim() !== "")?.trim() ?? "";

function officeChoice(row: ArkRow): ArkChoice {
  const id = userIdOf(row)!;
  const name = nameOf(row);
  const username = textOf(row, ["username", "userName"]);
  return { id, label: [name, username && username !== name ? username : ""].filter(Boolean).join(" · ") || `Office ${id}` };
}

/** Client policies ARK lists for the dealer. `kind` is ARK's path: generic or currency (script). */
async function clientPolicies(config: ArkConfig, kind: "generic" | "currency") {
  const rows = rowsOf(await get(config, `/admin/public/api/v2/client/${kind}/policy/${USER_TYPE.client}`));
  // Script policies come in groups (policyTypeId 2) that hold the real policies.
  const groups = new Map(rows.filter((r) => pick(r, ["policyTypeId"]) === 2).map((r) => [pick(r, ["id"]), textOf(r, ["policyName", "name"])]));
  return rows
    .filter((r) => pick(r, ["id"]) !== undefined && pick(r, ["policyTypeId"]) !== 2)
    .map((r) => {
      const id = pick(r, ["id"])!;
      const parent = pick(r, ["parentId"]);
      return { id, label: textOf(r, ["policyName", "name"]) || `Policy ${id}`, group: parent ? groups.get(parent) || undefined : undefined };
    })
    .sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label));
}

/** Every office the dealer can see and the client policies, for the settings dropdowns. */
async function loadArkChoices(): Promise<ArkChoices | { error: string }> {
  let config: ArkConfig;
  try {
    config = await loadArkConfig();
    await ensureArkSession(config);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const [offices, genericPolicies, scriptPolicies] = await Promise.all([
    section(async () => {
      const top = await findTopNode(config);
      const [list, self] = await Promise.all([
        listUsers(config, top, USER_TYPE.office),
        get(config, `/admin/public/api/v2/user/${top}`).then((d) => rowsOf(d)[0] ?? null, () => null),
      ]);
      const rows = [...list.rows];
      // The top node is an office too when the dealer sits directly under it.
      if (self && userTypeOf(self) === USER_TYPE.office && !rows.some((r) => userIdOf(r) === top)) rows.unshift(self);
      return rows
        .map(officeChoice)
        .sort((a, b) => a.label.localeCompare(b.label));
    }),
    section(() => clientPolicies(config, "generic")),
    section(() => clientPolicies(config, "currency")),
  ]);
  return { offices, genericPolicies, scriptPolicies };
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
      /** FundRequest and ArkMoneyTransaction IDs Bivora sent to ARK as requestReference. */
      bivoraReferences: string[];
    };

async function loadArkMoney(filters: MoneyFilters): Promise<ArkMoney> {
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
    ? [
        ...(await db.fundRequest.findMany({ where: { id: { in: references } }, select: { id: true } })),
        ...(await db.arkMoneyTransaction.findMany({ where: { id: { in: references } }, select: { id: true } })),
      ]
    : [];
  const ids = rows.map((r) => pick(r, ["id", "trxId"])).filter((v): v is number => v !== undefined);
  return {
    top,
    node,
    rows,
    older: rows.length === MONEY_PAGE && ids.length ? Math.min(...ids) : undefined,
    clients,
    bivoraReferences: known.map((k) => k.id),
  };
}

/** Bivora posts money with its FundRequest ID as requestReference and a comment starting "Bivora". */
export function isBivoraTransaction(row: ArkRow, references: ReadonlySet<string>) {
  const ref = typeof row.requestReference === "string" ? row.requestReference : "";
  const comment = typeof row.comment === "string" ? row.comment : typeof row.trxComment === "string" ? row.trxComment : "";
  return references.has(ref) || /^bivora\b/i.test(comment);
}

export const transactionIdOf = (row: ArkRow) => pick(row, ["id", "trxId"]);
export const amountOf = (row: ArkRow) => pick(row, ["amount", "trxAmount"]) ?? 0;
export const transactionTypeOf = (row: ArkRow) => pick(row, ["transactionTypeId", "trxType", "trxTypeId"]);


// ---------- Saving ARK money in Bivora ----------

const timeOf = (row: ArkRow) =>
  [row.transactionTime, row.trxDate, row.createdDate].find((v): v is string => typeof v === "string" && v !== "")?.slice(0, 19).replace("T", " ") ?? "";

/**
 * Keeps a copy of ARK money rows that belong to Bivora clients, so a client's page shows them.
 * Rows already saved are left alone (ARK's transaction ID is the key).
 */
export async function saveArkTransactions(rows: ArkRow[], references: ReadonlySet<string> = new Set()) {
  if (rows.length === 0) return 0;
  const accounts = await bivoraAccounts();
  const data = rows.flatMap((row) => {
    const id = transactionIdOf(row);
    const arkUserId = pick(row, ["userId", "userID"]);
    const client = arkUserId !== undefined ? accounts.get(arkUserId) : undefined;
    const type = transactionTypeOf(row);
    if (id === undefined || !client || type === undefined) return [];
    const comment = typeof row.comment === "string" ? row.comment : typeof row.trxComment === "string" ? row.trxComment : null;
    const reference = typeof row.requestReference === "string" && row.requestReference ? row.requestReference : null;
    return [{
      id: String(id),
      userId: client.id,
      arkUserId: String(arkUserId),
      type,
      amount: amountOf(row),
      comment: comment?.slice(0, 500) || null,
      reference,
      madeInBivora: isBivoraTransaction(row, references),
      time: timeOf(row) || new Date().toISOString().slice(0, 19).replace("T", " "),
    }];
  });
  if (data.length === 0) return 0;
  const { count } = await db.arkTransaction.createMany({ data, skipDuplicates: true });
  return count;
}

/** Every money transaction on one client's ARK account (newest 500), from ARK. */
async function loadClientMoney(arkUserId: string): Promise<{ rows: ArkRow[]; references: string[] } | { error: string }> {
  try {
    const config = await loadArkConfig();
    const query = new URLSearchParams({
      fromDate: "2000-01-01 00:00:00",
      toDate: arkDate(new Date(Date.now() + 86_400_000)),
      withDemo: "true",
      limit: "500",
    });
    const rows = rowsOf(await get(config, `/admin/public/api/v2/report/money/transaction/${encodeURIComponent(arkUserId)}?${query}`));
    const refs = [...new Set(rows.map((r) => r.requestReference).filter((v): v is string => typeof v === "string" && v !== ""))];
    const known = refs.length
      ? [
          ...(await db.fundRequest.findMany({ where: { id: { in: refs } }, select: { id: true } })),
          ...(await db.arkMoneyTransaction.findMany({ where: { id: { in: refs } }, select: { id: true } })),
        ]
      : [];
    return { rows, references: known.map((k) => k.id) };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    console.error("ARK client money failed", e instanceof Error ? e.message : "");
    return { error: "ARK sent a reply Bivora couldn't read." };
  }
}

// ---------- Cached reads ----------
// Pages show the last good ARK reply at once and refresh it in the background: see ./cache.ts.

/** One client's ARK money transactions, saved into Bivora as they arrive. */
export async function syncClientArkMoney(arkUserId: string) {
  const result = await arkCached("clientMoney", arkUserId, () => loadClientMoney(arkUserId));
  if ("error" in result) return { error: result.error };
  await saveArkTransactions(result.rows, new Set(result.references));
  return {};
}

/** Client accounts under one office (the saved office by default). */
export function getArkOverview(requestedNode?: number) {
  return arkCached("overview", requestedNode ?? null, () => loadArkOverview(requestedNode));
}

/** Offices and client policies for the ARK settings dropdowns. */
export function getArkChoices() {
  return arkCached("choices", null, loadArkChoices);
}

/** One page of ARK money transactions. */
export function getArkMoney(filters: MoneyFilters) {
  return arkCached("money", filters, () => loadArkMoney(filters));
}

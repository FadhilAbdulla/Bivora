import "server-only";
import { ArkError, arkFetch, loadArkConfig, loginDealer, type ArkConfig } from "./client";

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
    for (const key of ["content", "data", "rows", "list", "items"]) {
      const inner = (data as ArkRow)[key];
      if (Array.isArray(inner)) return rowsOf(inner);
    }
    return [data as ArkRow];
  }
  return [];
}

async function get(config: ArkConfig, token: string, path: string) {
  const result = await arkFetch<unknown>(config, path, { method: "GET", token });
  if (!result.ok) throw new ArkError(result.message || `ARK returned ${result.status}.`);
  return result.data;
}

/** The highest node the dealer can see: walk up from the dealer's own account. */
async function findTopNode(config: ArkConfig, token: string) {
  const dealer = rowsOf(
    await get(config, token, `/admin/public/api/v2/username/${encodeURIComponent(config.dealerUsername)}`).catch(() => null),
  )[0];
  let id = dealer ? userIdOf(dealer) : undefined;
  if (id === undefined) return config.parentId;
  let parent = parentIdOf(dealer);
  for (let i = 0; i < 10 && parent && parent > 0 && parent !== id; i++) {
    const row = rowsOf(await get(config, token, `/admin/public/api/v2/user/${parent}`).catch(() => null))[0];
    if (!row) break;
    id = parent;
    parent = parentIdOf(row);
  }
  return id;
}

/** Every user of one type under a node. ARK pages differ by report, so pages are merged by user ID. */
async function listUsers(config: ArkConfig, token: string, node: number, userTypeId: number) {
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
    const rows = rowsOf(await get(config, token, `/admin/public/api/v2/report/users/details/${node}?${query}`));
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

async function financials(config: ArkConfig, token: string, node: number) {
  const query = new URLSearchParams({ userIds: String(node), withDemo: "false" });
  return rowsOf(await get(config, token, `/financialStandings/public/api/v2/userFinancials?${query}`));
}

async function section<T>(work: () => Promise<T>): Promise<Section<T>> {
  try {
    return { data: await work() };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    console.error("ARK report failed", e);
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
  let token: string;
  try {
    config = await loadArkConfig();
    token = await loginDealer(config);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const top = await findTopNode(config, token);
  const node = requestedNode ?? top;
  const [nodeInfo, offices, clients, standing] = await Promise.all([
    get(config, token, `/admin/public/api/v2/user/${node}`).then((d) => rowsOf(d)[0] ?? null, () => null),
    section(() => listUsers(config, token, node, USER_TYPE.office)),
    section(() => listUsers(config, token, node, USER_TYPE.client)),
    section(() => financials(config, token, node)),
  ]);
  return { top, node, nodeInfo, offices, clients, financials: standing };
}

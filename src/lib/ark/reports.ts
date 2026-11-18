import "server-only";
import { arkCached } from "./cache";
import { ArkError, arkRequest, ensureArkSession, loadArkConfig, type ArkConfig } from "./client";

// The only list Bivora reads from ARK: the client policies for the ARK settings dropdowns.
// No ARK report is called anywhere: accounts and money come from Bivora's own records.

type ArkRow = Record<string, unknown>;
type Section<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/** ARK's user type for client accounts, which the policies are listed for. */
const CLIENT_USER_TYPE = 1;

function pick(row: ArkRow | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

const textOf = (row: ArkRow, keys: string[]) =>
  keys.map((k) => row[k]).find((v): v is string => typeof v === "string" && v.trim() !== "")?.trim() ?? "";

function rowsOf(data: unknown): ArkRow[] {
  if (Array.isArray(data)) return data.filter((r): r is ArkRow => typeof r === "object" && r !== null);
  if (data && typeof data === "object") {
    for (const key of ["content", "data", "rows", "list", "items"]) {
      const inner = (data as ArkRow)[key];
      if (Array.isArray(inner)) return rowsOf(inner);
    }
  }
  return [];
}

async function section<T>(work: () => Promise<T>): Promise<Section<T>> {
  try {
    return { data: await work() };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    console.error("ARK policy list failed", e instanceof Error ? e.message : "");
    return { error: "ARK sent a reply Bivora couldn't read." };
  }
}

// ---------- Choices for ARK settings ----------

export type ArkChoice = { id: number; label: string; group?: string };
export type ArkChoices = { genericPolicies: Section<ArkChoice[]>; scriptPolicies: Section<ArkChoice[]> };

/** Client policies ARK lists for the dealer. `kind` is ARK's path: generic or currency (script). */
async function clientPolicies(config: ArkConfig, kind: "generic" | "currency") {
  const result = await arkRequest<unknown>(config, `/admin/public/api/v2/client/${kind}/policy/${CLIENT_USER_TYPE}`, { method: "GET" });
  if (!result.ok) throw new ArkError(result.message || `ARK returned ${result.status}.`);
  const rows = rowsOf(result.data);
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

async function loadArkChoices(): Promise<ArkChoices | { error: string }> {
  let config: ArkConfig;
  try {
    config = await loadArkConfig();
    await ensureArkSession(config);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const [genericPolicies, scriptPolicies] = await Promise.all([
    section(() => clientPolicies(config, "generic")),
    section(() => clientPolicies(config, "currency")),
  ]);
  return { genericPolicies, scriptPolicies };
}

/** Client policies for the ARK settings dropdowns (saved briefly, see ./cache.ts). */
export function getArkChoices() {
  return arkCached("choices", null, loadArkChoices);
}

// ---------- Money transaction types ----------

export const TRANSACTION_TYPES: Record<number, string> = {
  1: "Deposit",
  2: "Withdrawal",
  3: "Credit in",
  4: "Credit out",
  5: "Adjustment",
  6: "Bonus",
};

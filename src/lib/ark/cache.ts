import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { after } from "next/server";
import { db } from "../db";

// ARK is slow, so admin pages show the last good ARK reply straight away and refresh it in the
// background once it's older than ARK_CACHE_SECONDS (30 by default; 0 turns this off). Kept in the
// database so every server shares it. Errors are never kept, so a failed call can't replace good data.

const EXPIRE_MS = 24 * 60 * 60_000;
/** A refresh that hasn't finished by now was cut off; another server may take over. */
const REFRESH_CLAIM_MS = 60_000;

function freshMs() {
  const n = Number(process.env.ARK_CACHE_SECONDS ?? 30);
  return (Number.isFinite(n) && n >= 0 ? n : 30) * 1000;
}

const keyOf = (name: string, args: unknown) => `${name}:${createHash("sha256").update(JSON.stringify(args ?? null)).digest("hex").slice(0, 32)}`;
/** A reply that failed, in whole or in one of its parts (e.g. the client list), is never kept. */
const isError = (data: object): boolean =>
  Object.entries(data).some(([key, value]) => (key === "error" && typeof value === "string") || (value && typeof value === "object" && !Array.isArray(value) && typeof (value as { error?: unknown }).error === "string"));

async function save(key: string, data: object) {
  const value = { data: data as Prisma.InputJsonValue, fetchedAt: new Date(), refreshingAt: null };
  await db.arkCache.upsert({ where: { key }, create: { key, ...value }, update: value });
}

async function refresh(key: string, load: () => Promise<object>) {
  const claim = await db.arkCache.updateMany({
    where: { key, OR: [{ refreshingAt: null }, { refreshingAt: { lt: new Date(Date.now() - REFRESH_CLAIM_MS) } }] },
    data: { refreshingAt: new Date() },
  });
  if (claim.count === 0) return;
  try {
    const data = await load();
    if (isError(data)) await db.arkCache.update({ where: { key }, data: { refreshingAt: null } });
    else await save(key, data);
  } catch (e) {
    await db.arkCache.update({ where: { key }, data: { refreshingAt: null } }).catch(() => {});
    console.error("ARK background refresh failed", key, e instanceof Error ? e.message : "");
  }
}

/** The saved reply for `name(args)`, refreshed in the background when old; fetched now when missing. */
export async function arkCached<T extends object>(name: string, args: unknown, load: () => Promise<T>): Promise<T> {
  const fresh = freshMs();
  if (fresh === 0) return load();
  const key = keyOf(name, args);
  const row = await db.arkCache.findUnique({ where: { key } });
  const age = row ? Date.now() - row.fetchedAt.getTime() : Infinity;
  if (row && age < EXPIRE_MS) {
    if (age >= fresh) after(() => refresh(key, load));
    return row.data as unknown as T;
  }
  const data = await load();
  if (!isError(data)) await save(key, data);
  return data;
}

/** After a change made in Bivora (settings, money, approvals), the next view asks ARK again. */
export async function clearArkCache() {
  await db.arkCache.deleteMany({});
}

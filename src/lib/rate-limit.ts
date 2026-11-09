import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

// Fixed-window attempt counters in Postgres, shared by every server instance.
// Keys are hashed so the table holds no emails or IP addresses.

const keyOf = (scope: string, id: string) => `${scope}:${createHash("sha256").update(id.toLowerCase()).digest("base64url")}`;

/** Counts one attempt. Returns false once `limit` attempts happened inside `windowMs`. */
export async function hit(scope: string, id: string, limit: number, windowMs: number) {
  const key = keyOf(scope, id);
  const since = new Date(Date.now() - windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${since} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${since} THEN NOW() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 1) <= limit;
}

/** Whether the limit is already used up, without counting an attempt. */
export async function isLimited(scope: string, id: string, limit: number, windowMs: number) {
  const row = await db.rateLimit.findUnique({ where: { key: keyOf(scope, id) } });
  return Boolean(row && row.windowStart.getTime() > Date.now() - windowMs && row.count >= limit);
}

export async function reset(scope: string, id: string) {
  await db.rateLimit.deleteMany({ where: { key: keyOf(scope, id) } });
}

/** The visitor's IP as Vercel reports it. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const MINUTE = 60_000;
export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

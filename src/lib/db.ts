import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Prisma's default pool is small (5 connections, 10 s wait), and one server handles many requests
 * at once, so busy admin pages could time out waiting for a connection. Settings already in the
 * URL win.
 */
function withPoolSettings(url: string | undefined) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return url;
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "10");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
    return u.toString();
  } catch {
    return url;
  }
}

// One client per server process. Next.js can load this module more than once (different bundles),
// and each PrismaClient opens its own connection pool, so it's kept on globalThis in production too.
export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: withPoolSettings(process.env.DATABASE_URL_POOLED) });
globalForPrisma.prisma = db;

import "server-only";
import { PrismaClient } from "@prisma/client";
import { ArkError, arkPing, arkSessionStatus } from "./ark/client";
import { db } from "./db";
import { missingEmailSettings } from "./email";
import { hasEncryptionKey } from "./secrets";

// Live measurements for the admin System health page. Nothing here changes data.

/** When this server process started, so the page can tell a fresh (cold) server from a warm one. */
const processStarted = Date.now();
let checksOnThisServer = 0;

export type Timed = { ms: number; error?: string };

async function timed(work: () => Promise<unknown>): Promise<Timed> {
  const started = Date.now();
  try {
    await work();
    return { ms: Date.now() - started };
  } catch (e) {
    return { ms: Date.now() - started, error: e instanceof Error ? e.message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) : "Failed" };
  }
}

/** A brand-new connection, as a fresh server or a busy pool has to open: the cost of a cold start. */
async function freshConnection(): Promise<Timed> {
  const url = process.env.DATABASE_URL_POOLED;
  if (!url) return { ms: 0, error: "DATABASE_URL_POOLED is not set." };
  let withOne = url;
  try {
    const u = new URL(url);
    u.searchParams.set("connection_limit", "1");
    withOne = u.toString();
  } catch {
    // Not a URL Prisma can be given settings in: use it as it is.
  }
  const client = new PrismaClient({ datasourceUrl: withOne });
  try {
    return await timed(() => client.$queryRaw`SELECT 1`);
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

export async function runHealthCheck() {
  checksOnThisServer++;
  const server = {
    region: process.env.VERCEL_REGION ?? "local",
    upSeconds: Math.round((Date.now() - processStarted) / 1000),
    checksOnThisServer,
    node: process.version,
  };

  // The shared pool: one query, then five in a row (each a full round trip to the database).
  const first = await timed(() => db.$queryRaw`SELECT 1`);
  const rounds: Timed[] = [];
  for (let i = 0; i < 5; i++) rounds.push(await timed(() => db.$queryRaw`SELECT 1`));
  const parallel = await timed(() => Promise.all(Array.from({ length: 8 }, () => db.$queryRaw`SELECT 1`)));
  const fresh = await freshConnection();

  let connections: { inUse: number; max: number } | { error: string };
  try {
    const [row] = await db.$queryRaw<{ in_use: number; max: number }[]>`
      SELECT (SELECT count(*)::int FROM pg_stat_activity) AS in_use, current_setting('max_connections')::int AS max`;
    connections = { inUse: row.in_use, max: row.max };
  } catch (e) {
    connections = { error: e instanceof Error ? e.message.slice(0, 200) : "Couldn't read." };
  }

  const session = await arkSessionStatus().catch(() => null);
  let ark: { ms: number; ok: boolean; status: number; message?: string } | { error: string } | null = null;
  if (session) {
    try {
      ark = await arkPing();
    } catch (e) {
      ark = { error: e instanceof ArkError ? e.message : "ARK check failed." };
    }
  }

  const ms = rounds.map((r) => r.ms);
  return {
    checkedAt: new Date(),
    server,
    database: {
      first,
      roundTrips: ms,
      median: [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)],
      roundTripError: rounds.find((r) => r.error)?.error,
      parallel,
      fresh,
      connections,
    },
    ark: { configured: Boolean(session), session, ping: ark },
    config: {
      email: missingEmailSettings(),
      storage: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].filter((k) => !process.env[k]),
      encryptionKey: hasEncryptionKey(),
      cronSecret: (process.env.CRON_SECRET ?? "").length >= 16,
    },
  };
}

import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// One client per server process. Next.js can load this module more than once (different bundles),
// and each PrismaClient opens its own connection pool, so it's kept on globalThis in production too.
export const db = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = db;

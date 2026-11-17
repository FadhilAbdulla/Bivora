import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { canEditKyc } from "./kyc";
import { readSession } from "./session";
import type { SessionKind } from "./session-token";

// Data access layer: every page and server action resolves the user through
// these helpers, so role and status changes take effect on the next request.

const ROLE_FOR: Record<SessionKind, string> = { client: "USER", admin: "SUPER_ADMIN" };

// Cached per request: the layout, the page and each section share one database lookup.
const resolve = cache(async (kind: SessionKind) => {
  const session = await readSession(kind);
  if (!session) return { user: null, hasSession: false };

  const started = Date.now();
  const user = await db.user.findUnique({ where: { id: session.userId } });
  const ms = Date.now() - started;
  // Usually a few milliseconds; seconds here mean the database connection is the slow part.
  if (ms > 1000) console.warn(`Slow database: user lookup took ${ms} ms`);
  // Sessions signed before a password change or suspension carry an older version.
  if (!user || user.status !== "ACTIVE" || user.role !== ROLE_FOR[kind] || (session.v ?? 0) !== user.sessionVersion) {
    return { user: null, hasSession: true };
  }
  return { user, hasSession: true };
});

async function requireFor(kind: SessionKind, loginPath: string) {
  const { user, hasSession } = await resolve(kind);
  // A signed-in session whose user is no longer allowed must be cleared first,
  // otherwise the proxy sends the login page straight back here.
  if (!user) redirect(hasSession ? `/auth/clear?kind=${kind}` : loginPath);
  return user;
}

export async function getCurrentUser() {
  return (await resolve("client")).user;
}

/** A signed-in client who may still be onboarding. */
export function requireOnboardingUser() {
  return requireFor("client", "/login");
}

/** A signed-in client ready for the document steps. Clients who signed up with Google add their phone number first. */
export async function requireDocumentsUser() {
  const user = await requireFor("client", "/login");
  if (!user.phone) redirect("/onboarding/phone");
  return user;
}

/** A signed-in client who has submitted their documents. Everyone else, including rejected clients, must finish onboarding. */
export async function requireUser() {
  const user = await requireFor("client", "/login");
  if (canEditKyc(user.kycStatus)) redirect("/onboarding");
  return user;
}

export async function getCurrentAdmin() {
  return (await resolve("admin")).user;
}

export function requireAdmin() {
  return requireFor("admin", "/admin/login");
}

import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { isKycApproved } from "./kyc";
import { readSession } from "./session";
import type { SessionKind } from "./session-token";

// Data access layer: every page and server action resolves the user through
// these helpers, so role and status changes take effect on the next request.

const ROLE_FOR: Record<SessionKind, string> = { client: "USER", admin: "SUPER_ADMIN" };

async function resolve(kind: SessionKind) {
  const session = await readSession(kind);
  if (!session) return { user: null, hasSession: false };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE" || user.role !== ROLE_FOR[kind]) return { user: null, hasSession: true };
  return { user, hasSession: true };
}

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

/** A signed-in client whose documents are approved. Everyone else stays in onboarding until they are. */
export async function requireUser() {
  const user = await requireFor("client", "/login");
  if (!isKycApproved(user.kycStatus)) redirect("/onboarding");
  return user;
}

export async function getCurrentAdmin() {
  return (await resolve("admin")).user;
}

export function requireAdmin() {
  return requireFor("admin", "/admin/login");
}

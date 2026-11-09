import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "./db";
import { isKycApproved } from "./kyc";

export const GOOGLE_COOKIE = "bivora_google";
export const redirectUri = (origin: string) => `${origin}/auth/google/callback`;

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export type GoogleProfile = { sub: string; email: string; firstName: string; lastName: string };

/** Swaps the one-time code for Google's signed statement of who signed in. */
export async function fetchGoogleProfile(code: string, origin: string, nonce: string): Promise<GoogleProfile | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return null;
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) return null;

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.email !== "string" || !payload.sub) {
    return null;
  }
  const given = typeof payload.given_name === "string" ? payload.given_name : "";
  const family = typeof payload.family_name === "string" ? payload.family_name : "";
  const name = typeof payload.name === "string" ? payload.name : "";
  return { sub: payload.sub, email: payload.email.toLowerCase(), firstName: given || name || "Client", lastName: family };
}

/** Finds the client for a Google sign-in, or opens a new account. New accounts add a phone number at /onboarding/phone. */
export async function resolveGoogleUser(profile: GoogleProfile) {
  const user =
    (await db.user.findUnique({ where: { googleId: profile.sub } })) ??
    (await db.user.findUnique({ where: { email: profile.email } }));

  if (!user) {
    const created = await db.user.create({
      data: { email: profile.email, googleId: profile.sub, firstName: profile.firstName, lastName: profile.lastName },
    });
    return { user: created, created: true };
  }

  // Super admins sign in through /admin/login only.
  if (user.role !== "USER" || (user.googleId && user.googleId !== profile.sub)) return { error: "failed" };
  if (user.status !== "ACTIVE") return { error: "suspended" };
  if (user.googleId) return { user };

  // Signup doesn't verify email addresses, so someone else could have registered this one first.
  // Google has now proved who owns it, so an unverified account loses its password when linked.
  const linked = await db.user.update({
    where: { id: user.id },
    // Removing the password also ends any session made with it.
    data: {
      googleId: profile.sub,
      ...(!isKycApproved(user.kycStatus) && { passwordHash: null, sessionVersion: { increment: 1 } }),
    },
  });
  return { user: linked };
}

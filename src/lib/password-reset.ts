import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { sessionKey } from "./session-token";

// Reset links are signed rather than stored. Each carries a fingerprint of the current
// password, so it stops working as soon as the password changes: a link works only once.

const AUDIENCE = "password-reset";
export const RESET_COOLDOWN_MS = 2 * 60 * 1000;

const fingerprint = (passwordHash: string | null) =>
  createHash("sha256").update(passwordHash ?? "no-password").digest("base64url");

export function signResetToken(user: { id: string; passwordHash: string | null }) {
  return new SignJWT({ userId: user.id, fp: fingerprint(user.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setExpirationTime("1h")
    .sign(sessionKey());
}

export async function readResetToken(token: string) {
  try {
    const { payload } = await jwtVerify<{ userId: string; fp: string }>(token, sessionKey(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
}

export function matchesPassword(passwordHash: string | null, fp: string) {
  return fingerprint(passwordHash) === fp;
}

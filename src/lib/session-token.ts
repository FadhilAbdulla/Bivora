// Edge-safe JWT helpers, shared by proxy.ts and the server session module.
// Clients and super admins get separate cookies and token audiences, so a
// client session can never be used to reach the admin console.
import { SignJWT, jwtVerify } from "jose";

export type SessionKind = "client" | "admin";

export const SESSIONS = {
  client: { cookie: "bivora_session", ttlSeconds: 60 * 60 * 24 * 7 },
  admin: { cookie: "bivora_admin_session", ttlSeconds: 60 * 60 * 8 },
} as const satisfies Record<SessionKind, { cookie: string; ttlSeconds: number }>;

export type SessionPayload = { userId: string };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(kind: SessionKind, payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(kind)
    .setIssuedAt()
    .setExpirationTime(`${SESSIONS[kind].ttlSeconds}s`)
    .sign(key());
}

export async function verifySession(kind: SessionKind, token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, key(), {
      algorithms: ["HS256"],
      audience: kind,
    });
    return payload;
  } catch {
    return null;
  }
}

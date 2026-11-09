import "server-only";
import { cookies } from "next/headers";
import { SESSIONS, signSession, verifySession, type SessionKind, type SessionPayload } from "./session-token";

export async function createSession(kind: SessionKind, user: { id: string; sessionVersion: number }) {
  const payload: SessionPayload = { userId: user.id, v: user.sessionVersion };
  const { cookie, ttlSeconds } = SESSIONS[kind];
  (await cookies()).set(cookie, await signSession(kind, payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: kind === "admin" ? "strict" : "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export async function readSession(kind: SessionKind) {
  return verifySession(kind, (await cookies()).get(SESSIONS[kind].cookie)?.value);
}

export async function deleteSession(kind: SessionKind) {
  (await cookies()).delete(SESSIONS[kind].cookie);
}

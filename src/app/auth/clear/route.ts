import { NextResponse, type NextRequest } from "next/server";
import { SESSIONS, type SessionKind } from "@/lib/session-token";

// Clears a session whose token is still valid but whose user was suspended or
// removed. Without this, the proxy would bounce between the login page and the
// app, because it only checks the token signature.
export function GET(request: NextRequest) {
  const kind: SessionKind = request.nextUrl.searchParams.get("kind") === "admin" ? "admin" : "client";
  const response = NextResponse.redirect(new URL(kind === "admin" ? "/admin/login" : "/login", request.url));
  response.cookies.delete(SESSIONS[kind].cookie);
  return response;
}

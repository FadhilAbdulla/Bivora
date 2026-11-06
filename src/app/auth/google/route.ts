import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_COOKIE, isGoogleConfigured, redirectUri } from "@/lib/google";

// Sends the visitor to Google. The state and nonce come back to the callback, tying it to this browser.
export function GET(request: NextRequest) {
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/login?google=failed", request.url));

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(request.nextUrl.origin),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
    nonce,
  }).toString();

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_COOKIE, JSON.stringify({ state, nonce }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return response;
}

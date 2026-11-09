import { NextResponse, type NextRequest } from "next/server";
import { sendLater, sendWelcomeEmail } from "@/lib/email";
import { GOOGLE_COOKIE, fetchGoogleProfile, isGoogleConfigured, resolveGoogleUser } from "@/lib/google";
import { createSession } from "@/lib/session";

function readCookie(value: string | undefined) {
  try {
    const parsed = JSON.parse(value ?? "");
    return typeof parsed.state === "string" && typeof parsed.nonce === "string" ? (parsed as { state: string; nonce: string }) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.delete({ name: GOOGLE_COOKIE, path: "/auth/google" });
    return response;
  };

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const saved = readCookie(request.cookies.get(GOOGLE_COOKIE)?.value);
  if (!isGoogleConfigured() || !code || !saved || searchParams.get("state") !== saved.state) {
    return finish(searchParams.get("error") === "access_denied" ? "/login" : "/login?google=failed");
  }

  try {
    const profile = await fetchGoogleProfile(code, origin, saved.nonce);
    if (!profile) return finish("/login?google=failed");

    const { user, error, created } = await resolveGoogleUser(profile);
    if (!user) return finish(`/login?google=${error}`);

    await createSession("client", user);
    if (created) sendLater("Welcome", () => sendWelcomeEmail(user));
    return finish("/dashboard");
  } catch (e) {
    console.error("Google sign-in failed", e instanceof Error ? e.message : "");
    return finish("/login?google=failed");
  }
}

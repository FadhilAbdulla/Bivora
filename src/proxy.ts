import { NextResponse, type NextRequest } from "next/server";
import { SESSIONS, verifySession } from "@/lib/session-token";

// Optimistic redirects only. Pages and server actions still authorize through
// the data access layer in src/lib/auth.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const redirectTo = (path: string, next?: string) => {
    const url = new URL(path, request.url);
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    const admin = await verifySession("admin", request.cookies.get(SESSIONS.admin.cookie)?.value);
    if (pathname === "/admin/login") return admin ? redirectTo("/admin") : NextResponse.next();
    return admin ? NextResponse.next() : redirectTo("/admin/login");
  }

  const client = await verifySession("client", request.cookies.get(SESSIONS.client.cookie)?.value);
  if (pathname.startsWith("/dashboard") && !client) return redirectTo("/login", pathname);
  if ((pathname === "/login" || pathname === "/signup") && client) return redirectTo("/dashboard");

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
};

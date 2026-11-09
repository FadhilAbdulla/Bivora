import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ArkError, arkHeartbeat } from "@/lib/ark/client";

// Vercel Cron calls this every 10 minutes (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// ARK ends a dealer session 60 minutes after its last request; the heartbeat keeps it open.

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ session: await arkHeartbeat() });
  } catch (e) {
    if (e instanceof ArkError) return NextResponse.json({ error: e.message }, { status: 502 });
    throw e;
  }
}

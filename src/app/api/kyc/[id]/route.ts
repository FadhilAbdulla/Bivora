import type { NextRequest } from "next/server";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditKyc } from "@/lib/kyc";
import { createViewLink, removeDocument } from "@/lib/kyc-storage";

const notFound = () => Response.json({ error: "Not found." }, { status: 404 });

// Only the client who uploaded a document, or a super admin, can open it. Anyone
// else gets the same 404 as a missing file, so ids reveal nothing.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/kyc/[id]">) {
  const { id } = await ctx.params;
  const doc = await db.kycDocument.findUnique({ where: { id } });
  if (!doc) return notFound();

  const allowed = (await getCurrentAdmin()) ?? ((await getCurrentUser())?.id === doc.userId ? true : null);
  if (!allowed) return notFound();

  // Redirected rather than passed through here, because Vercel limits responses to 4.5 MB.
  return new Response(null, {
    status: 302,
    headers: { Location: await createViewLink(doc), "Cache-Control": "private, no-store" },
  });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/kyc/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const doc = await db.kycDocument.findUnique({ where: { id } });
  if (!user || !doc || doc.userId !== user.id) return notFound();
  if (!canEditKyc(user.kycStatus)) {
    return Response.json({ error: "Your documents have already been submitted." }, { status: 409 });
  }
  await db.kycDocument.delete({ where: { id } });
  await removeDocument(doc.storageKey);
  return Response.json({ ok: true });
}

import { deleteDocument } from "@/lib/kyc-upload";
import { clientForAdmin, fail } from "../access";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/clients/[id]/kyc/[docId]">) {
  const { id, docId } = await ctx.params;
  const client = await clientForAdmin(id);
  if (client instanceof Response) return client;
  return (await deleteDocument(client.id, docId)) ? Response.json({ ok: true }) : fail("Not found.", 404);
}

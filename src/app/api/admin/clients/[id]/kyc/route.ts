import { saveUpload } from "@/lib/kyc-upload";
import { clientForAdmin, fail } from "./access";

// An admin adding a document for a client: step 2, check the stored file and record it.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/clients/[id]/kyc">) {
  const client = await clientForAdmin((await ctx.params).id);
  if (client instanceof Response) return client;
  try {
    const result = await saveUpload(client.id, (await request.json().catch(() => null)) ?? {});
    if (!result.ok) return fail(result.error, result.status);
    return Response.json({ document: result.document, removedId: result.removedIds[0] ?? null, removedIds: result.removedIds });
  } catch (e) {
    console.error("Upload check failed", e instanceof Error ? e.message : "");
    return fail("Uploads aren't available right now. Please try again later.", 503);
  }
}

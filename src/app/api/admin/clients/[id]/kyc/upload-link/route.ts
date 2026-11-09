import { getCurrentAdmin } from "@/lib/auth";
import { uploadLinkFor } from "@/lib/kyc-upload";
import { MINUTE, hit } from "@/lib/rate-limit";
import { clientForAdmin, fail } from "../access";

// An admin adding a document for a client: step 1, a link to send the file straight to storage.
export async function POST(request: Request, ctx: RouteContext<"/api/admin/clients/[id]/kyc/upload-link">) {
  const client = await clientForAdmin((await ctx.params).id);
  if (client instanceof Response) return client;
  const admin = await getCurrentAdmin();
  if (!admin || !(await hit("admin-upload-link", admin.id, 200, 60 * MINUTE))) return fail("Too many uploads. Please wait a while and try again.", 429);
  try {
    const result = await uploadLinkFor(client.id, (await request.json().catch(() => null)) ?? {});
    return result.ok ? Response.json(result.link) : fail(result.error, result.status);
  } catch (e) {
    console.error("Upload link failed", e instanceof Error ? e.message : "");
    return fail("Uploads aren't available right now. Please try again later.", 503);
  }
}

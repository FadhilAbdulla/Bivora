import { getCurrentUser } from "@/lib/auth";
import { canEditKyc } from "@/lib/kyc";
import { saveUpload } from "@/lib/kyc-upload";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

// Second step of an upload: checks the file now in storage and records it. A file that fails is deleted.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  if (!canEditKyc(user.kycStatus)) return fail("Your documents have already been submitted.", 409);

  const body = await request.json().catch(() => null);
  try {
    const result = await saveUpload(user.id, body ?? {});
    if (!result.ok) return fail(result.error, result.status);
    return Response.json({ document: result.document, removedId: result.removedIds[0] ?? null, removedIds: result.removedIds });
  } catch (e) {
    console.error("Upload check failed", e instanceof Error ? e.message : "");
    return fail("Uploads aren't available right now. Please try again later.", 503);
  }
}

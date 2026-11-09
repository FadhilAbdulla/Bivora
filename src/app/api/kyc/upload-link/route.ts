import { getCurrentUser } from "@/lib/auth";
import { canEditKyc } from "@/lib/kyc";
import { uploadLinkFor } from "@/lib/kyc-upload";
import { MINUTE, hit } from "@/lib/rate-limit";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

// First step of an upload: gives the browser a link to send this one file straight to storage.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  if (!canEditKyc(user.kycStatus)) return fail("Your documents have already been submitted.", 409);

  const body = await request.json().catch(() => null);
  // Plenty for retakes, but stops anyone filling the bucket.
  if (!(await hit("upload-link", user.id, 60, 60 * MINUTE))) return fail("Too many uploads. Please wait a while and try again.", 429);

  try {
    const result = await uploadLinkFor(user.id, body ?? {});
    return result.ok ? Response.json(result.link) : fail(result.error, result.status);
  } catch (e) {
    console.error("Upload link failed", e instanceof Error ? e.message : "");
    return fail("Uploads aren't available right now. Please try again later.", 503);
  }
}

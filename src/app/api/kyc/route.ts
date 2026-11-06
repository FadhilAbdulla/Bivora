import { basename } from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_TYPES, MAX_DOCUMENT_BYTES, PDF_TYPE, canEditKyc, findSlot } from "@/lib/kyc";
import { detectMimeType, inspectUpload, isOwnStorageKey, removeDocument } from "@/lib/kyc-storage";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

// Second step of an upload: checks the file now in storage and records it. A file that fails is deleted.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  if (!canEditKyc(user.kycStatus)) return fail("Your documents have already been submitted.", 409);

  const body = await request.json().catch(() => null);
  const type = String(body?.type ?? "");
  const slot = String(body?.slot ?? "");
  const storageKey = String(body?.storageKey ?? "");
  const def = findSlot(type, slot);
  if (!def || !isOwnStorageKey(user.id, storageKey)) return fail("Invalid upload.");

  try {
    const upload = await inspectUpload(storageKey);
    if (!upload) return fail("We couldn't find that upload. Please try again.");

    const reject = async (error: string, status?: number) => {
      await removeDocument(storageKey);
      return fail(error, status);
    };
    if (upload.size > MAX_DOCUMENT_BYTES) return reject("That file is too large. The limit is 10 MB.", 413);
    const mimeType = detectMimeType(upload.head);
    if (!mimeType) return reject("Please upload a JPG, PNG, WebP or PDF file.");
    if (def.imagesOnly && !IMAGE_TYPES.includes(mimeType)) return reject("Please upload a photo for this page.");

    if (slot === "BACK") {
      const front = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId: user.id, type, slot: "FRONT" } } });
      if (front?.mimeType === PDF_TYPE) return reject("Your PDF already covers both sides.");
    }

    const previous = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId: user.id, type, slot } } });
    const data = { fileName: basename(String(body?.fileName ?? "")).slice(0, 120) || "document", mimeType, size: upload.size, storageKey };
    const doc = await db.kycDocument.upsert({
      where: { userId_type_slot: { userId: user.id, type, slot } },
      create: { userId: user.id, type, slot, ...data },
      update: { ...data, createdAt: new Date() },
    });
    if (previous && previous.storageKey !== storageKey) await removeDocument(previous.storageKey);

    // A PDF holds every page, so a separately uploaded back page no longer applies.
    let removedId: string | null = null;
    if (slot === "FRONT" && mimeType === PDF_TYPE) {
      const back = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId: user.id, type, slot: "BACK" } } });
      if (back) {
        await db.kycDocument.delete({ where: { id: back.id } });
        await removeDocument(back.storageKey);
        removedId = back.id;
      }
    }

    const { id, fileName, size } = doc;
    return Response.json({ document: { id, type, slot, fileName, mimeType, size }, removedId });
  } catch (e) {
    console.error("Upload check failed", e instanceof Error ? e.message : "");
    return fail("Uploads aren't available right now. Please try again later.", 503);
  }
}

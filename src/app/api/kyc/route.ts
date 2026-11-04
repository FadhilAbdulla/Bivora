import { basename } from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_TYPES, MAX_DOCUMENT_BYTES, PDF_TYPE, canEditKyc, findSlot } from "@/lib/kyc";
import { detectMimeType, removeDocument, storeDocument } from "@/lib/kyc-storage";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  if (!canEditKyc(user.kycStatus)) return fail("Your documents have already been submitted.", 409);

  // Reject oversized bodies before reading them into memory.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_DOCUMENT_BYTES + 64 * 1024) {
    return fail("That file is too large. The limit is 10 MB.", 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const type = String(form?.get("type") ?? "");
  const slot = String(form?.get("slot") ?? "");
  const def = findSlot(type, slot);
  if (!def || !(file instanceof File)) return fail("Invalid upload.");
  if (file.size === 0) return fail("That file is empty.");
  if (file.size > MAX_DOCUMENT_BYTES) return fail("That file is too large. The limit is 10 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectMimeType(bytes);
  if (!mimeType) return fail("Please upload a JPG, PNG, WebP or PDF file.");
  if (def.imagesOnly && !IMAGE_TYPES.includes(mimeType)) return fail("Please upload a photo for this page.");

  if (slot === "BACK") {
    const front = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId: user.id, type, slot: "FRONT" } } });
    if (front?.mimeType === PDF_TYPE) return fail("Your PDF already covers both sides.");
  }

  const previous = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId: user.id, type, slot } } });
  const storageKey = await storeDocument(user.id, bytes);
  const data = { fileName: basename(file.name).slice(0, 120) || "document", mimeType, size: file.size, storageKey };
  const doc = await db.kycDocument.upsert({
    where: { userId_type_slot: { userId: user.id, type, slot } },
    create: { userId: user.id, type, slot, ...data },
    update: { ...data, createdAt: new Date() },
  });
  if (previous) await removeDocument(previous.storageKey);

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
}

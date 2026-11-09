import "server-only";
import { basename } from "node:path";
import { db } from "./db";
import { BOTH_SLOT, IMAGE_TYPES, MAX_DOCUMENT_BYTES, PDF_TYPE, findSlot } from "./kyc";
import { createUploadLink, detectMimeType, inspectUpload, isOwnStorageKey, removeDocument } from "./kyc-storage";

// The checks for an ID document upload, shared by the client's own onboarding and by admins adding
// documents for a client. Every failure deletes the stored file.

export type UploadResult =
  | { ok: true; document: { id: string; type: string; slot: string; fileName: string; mimeType: string; size: number }; removedIds: string[] }
  | { ok: false; error: string; status: number };

const fail = (error: string, status = 400) => ({ ok: false as const, error, status });

/** Step 1: a link to send one file straight to storage, under the client's folder. */
export async function uploadLinkFor(userId: string, body: { type?: unknown; slot?: unknown; size?: unknown }) {
  const size = Number(body.size);
  if (!findSlot(String(body.type ?? ""), String(body.slot ?? "")) || !Number.isInteger(size)) return fail("Invalid upload.");
  if (size <= 0) return fail("That file is empty.");
  if (size > MAX_DOCUMENT_BYTES) return fail("That file is too large. The limit is 10 MB.", 413);
  return { ok: true as const, link: await createUploadLink(userId, size) };
}

async function removeSlot(userId: string, type: string, slot: string) {
  const doc = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId, type, slot } } });
  if (!doc) return null;
  await db.kycDocument.delete({ where: { id: doc.id } });
  await removeDocument(doc.storageKey);
  return doc.id;
}

/** Step 2: checks the file now in storage and records it against the client. */
export async function saveUpload(userId: string, body: { type?: unknown; slot?: unknown; storageKey?: unknown; fileName?: unknown }): Promise<UploadResult> {
  const type = String(body.type ?? "");
  const slot = String(body.slot ?? "");
  const storageKey = String(body.storageKey ?? "");
  const def = findSlot(type, slot);
  if (!def || !isOwnStorageKey(userId, storageKey)) return fail("Invalid upload.");

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
    const front = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId, type, slot: "FRONT" } } });
    if (front?.mimeType === PDF_TYPE) return reject("Your PDF already covers both sides.");
  }

  const previous = await db.kycDocument.findUnique({ where: { userId_type_slot: { userId, type, slot } } });
  const data = { fileName: basename(String(body.fileName ?? "")).slice(0, 120) || "document", mimeType, size: upload.size, storageKey };
  const doc = await db.kycDocument.upsert({
    where: { userId_type_slot: { userId, type, slot } },
    create: { userId, type, slot, ...data },
    update: { ...data, createdAt: new Date() },
  });
  if (previous && previous.storageKey !== storageKey) await removeDocument(previous.storageKey);

  // One file for both sides replaces separate ones, and separate ones replace a combined file.
  // A PDF under Front holds every page, so a separate back page no longer applies either.
  const replaced =
    slot === BOTH_SLOT.slot
      ? ["FRONT", "BACK"]
      : slot === "FRONT" && mimeType === PDF_TYPE
        ? ["BACK", BOTH_SLOT.slot]
        : slot === "FRONT" || slot === "BACK"
          ? [BOTH_SLOT.slot]
          : [];
  const removedIds: string[] = [];
  for (const other of replaced) {
    const id = await removeSlot(userId, type, other);
    if (id) removedIds.push(id);
  }

  return { ok: true, document: { id: doc.id, type, slot, fileName: doc.fileName, mimeType, size: doc.size }, removedIds };
}

/** Removes one of the client's documents. */
export async function deleteDocument(userId: string, id: string) {
  const doc = await db.kycDocument.findUnique({ where: { id } });
  if (!doc || doc.userId !== userId) return false;
  await db.kycDocument.delete({ where: { id } });
  await removeDocument(doc.storageKey);
  return true;
}

import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { IMAGE_TYPES, PDF_TYPE } from "./kyc";

// Files are kept outside public/ under random names, and only reach a browser
// through the authorizing route handler in src/app/api/kyc/[id]/route.ts.
function root() {
  return process.env.KYC_STORAGE_DIR || join(process.cwd(), "storage/kyc");
}

/** Identifies a file from its first bytes; the name and browser-sent type can't be trusted. */
export function detectMimeType(b: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return IMAGE_TYPES[0];
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return IMAGE_TYPES[1];
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return IMAGE_TYPES[2];
  if (ascii(0, 5) === "%PDF-") return PDF_TYPE;
  return null;
}

export async function storeDocument(userId: string, bytes: Uint8Array) {
  const storageKey = `${userId}/${randomUUID()}`;
  await mkdir(join(root(), userId), { recursive: true });
  await writeFile(join(root(), storageKey), bytes, { mode: 0o600 });
  return storageKey;
}

export function readDocument(storageKey: string) {
  return readFile(join(root(), storageKey));
}

export async function removeDocument(storageKey: string) {
  await rm(join(root(), storageKey), { force: true });
}

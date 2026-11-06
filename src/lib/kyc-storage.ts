import "server-only";
import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { IMAGE_TYPES, PDF_TYPE } from "./kyc";

// Files live in a private Cloudflare R2 bucket. Browsers upload to it directly, because Vercel
// rejects request bodies over 4.5 MB, using short-lived links signed for one key and one size.
// Files only reach a browser after src/app/api/kyc/[id]/route.ts has checked who is asking.

const LINK_SECONDS = 300;
const VIEW_SECONDS = 60;

function bucket() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("R2 storage is not configured");
  }
  return {
    client: new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
    objectUrl: (key: string) => `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`,
  };
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

export const isOwnStorageKey = (userId: string, key: string) =>
  key.startsWith(`${userId}/`) && /^[0-9a-f-]{36}$/.test(key.slice(userId.length + 1));

/** A link that accepts exactly one file of exactly this size, for a few minutes. */
export async function createUploadLink(userId: string, size: number) {
  const { client, objectUrl } = bucket();
  const storageKey = `${userId}/${randomUUID()}`;
  const signed = await client.sign(`${objectUrl(storageKey)}?X-Amz-Expires=${LINK_SECONDS}`, {
    method: "PUT",
    headers: { "content-length": String(size) },
    aws: { signQuery: true, allHeaders: true },
  });
  return { storageKey, url: signed.url };
}

/** The real size and opening bytes of an uploaded file, or null if it isn't there. */
export async function inspectUpload(storageKey: string) {
  const { client, objectUrl } = bucket();
  const response = await client.fetch(objectUrl(storageKey), { headers: { range: "bytes=0-15" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 returned ${response.status}`);
  const size = Number(response.headers.get("content-range")?.split("/")[1] ?? response.headers.get("content-length"));
  return { size, head: new Uint8Array(await response.arrayBuffer()) };
}

/** A link that opens the file for about a minute. Only hand this out after checking who is asking. */
export async function createViewLink(doc: { storageKey: string; fileName: string; mimeType: string }) {
  const { client, objectUrl } = bucket();
  const query = new URLSearchParams({
    "X-Amz-Expires": String(VIEW_SECONDS),
    "response-content-type": doc.mimeType,
    "response-content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    "response-cache-control": "private, no-store",
  });
  const signed = await client.sign(`${objectUrl(doc.storageKey)}?${query}`, { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

export async function removeDocument(storageKey: string) {
  const { client, objectUrl } = bucket();
  const response = await client.fetch(objectUrl(storageKey), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`R2 returned ${response.status}`);
}

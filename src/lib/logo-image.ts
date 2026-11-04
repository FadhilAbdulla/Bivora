import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The logo as a data URI, for generated images (app icon, share image). */
export async function logoDataUri() {
  const svg = await readFile(join(process.cwd(), "public/brand/bivora-logo.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

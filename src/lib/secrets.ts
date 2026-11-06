import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts secrets kept in the database, such as the ARK dealer password. The key stays in the
// environment, so a copy of the database alone can't reveal them.

export class SecretKeyError extends Error {}

function key() {
  const value = Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY ?? "", "base64");
  if (value.length !== 32) {
    throw new SecretKeyError("SETTINGS_ENCRYPTION_KEY is missing or invalid. Generate one with: openssl rand -base64 32");
  }
  return value;
}

export function hasEncryptionKey() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string) {
  const [, iv, tag, data] = stored.split(":");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch (e) {
    if (e instanceof SecretKeyError) throw e;
    throw new SecretKeyError("The saved password can't be read with the current SETTINGS_ENCRYPTION_KEY. Enter it again.");
  }
}

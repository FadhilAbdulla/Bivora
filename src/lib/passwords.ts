import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";

/** bcrypt only reads 72 bytes, and very long inputs only cost CPU. */
export const MAX_PASSWORD = 128;

export const strongPassword = (min = 8, prefix = "Password") =>
  z
    .string()
    .min(min, `${prefix} must be at least ${min} characters.`)
    .max(MAX_PASSWORD, `${prefix} must be at most ${MAX_PASSWORD} characters.`)
    .regex(/[A-Za-z]/, `${prefix} must contain a letter.`)
    .regex(/[0-9]/, `${prefix} must contain a number.`);

// A real hash of a throwaway value. Checking against it when there is no account takes as long
// as a real check, so response times don't reveal which emails are registered.
const DUMMY_HASH = "$2b$12$/0t2FOVorSRlqzXBZGFkTuRDJhmoRFw.XxP3ZA8NuqmL88UHDH326";

/** Compares a password, spending the same time whether or not there is a hash to compare with. */
export async function checkPassword(password: string, hash: string | null | undefined) {
  const ok = await bcrypt.compare(password.slice(0, MAX_PASSWORD), hash ?? DUMMY_HASH);
  return Boolean(hash) && ok;
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

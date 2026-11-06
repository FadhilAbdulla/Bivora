// Creates a super admin in the database, or resets the password of an existing one.
// Nothing is kept in settings files: only the email and a password hash are stored.
// Usage: npm run admin:create
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const emailSchema = z.email("Enter a valid email address.").trim().toLowerCase();
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

const db = new PrismaClient();

async function main() {
  if (!process.stdin.isTTY) throw new Error("Run this in a terminal, so the password can be typed privately.");

  // Keeps the password off the screen while it's typed.
  let hidden = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!hidden) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const askHidden = async (question: string) => {
    const answer = rl.question(question);
    hidden = true;
    const value = await answer;
    hidden = false;
    process.stdout.write("\n");
    return value;
  };

  let email: string;
  let password: string;
  try {
    email = emailSchema.parse(await rl.question("Admin email: "));
    password = passwordSchema.parse(await askHidden("Admin password: "));
    if (password !== (await askHidden("Repeat password: "))) throw new Error("Passwords don't match.");
  } finally {
    rl.close();
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.role !== "SUPER_ADMIN") {
    throw new Error("A client account already uses this email. Use a different email for the admin.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { passwordHash, status: "ACTIVE" },
    create: { email, passwordHash, firstName: "Super", lastName: "Admin", role: "SUPER_ADMIN" },
  });
  console.log(existing ? `Password updated for ${email}.` : `Super admin created: ${email}. Sign in at /admin/login.`);
}

main()
  .catch((e) => {
    console.error(e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

import "server-only";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const fail = (error: string, status = 400) => Response.json({ error }, { status });

/**
 * An admin may add or change a client's documents until the client is approved (their ARK account
 * is created from them). Anyone else gets a 404, so client ids reveal nothing.
 */
export async function clientForAdmin(id: string): Promise<{ id: string } | Response> {
  const admin = await getCurrentAdmin();
  const client = admin ? await db.user.findFirst({ where: { id, role: "USER" }, select: { id: true, kycStatus: true } }) : null;
  if (!client) return fail("Not found.", 404);
  if (client.kycStatus === "APPROVED" || client.kycStatus === "APPROVING") return fail("This client is approved, so their documents can't change.", 409);
  return { id: client.id };
}

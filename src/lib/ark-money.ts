import "server-only";
import { Prisma } from "@prisma/client";
import { ArkError, MANUAL_MONEY_TYPES, loadArkConfig, postArkMoney, type ManualMoneyType } from "./ark/client";
import { db } from "./db";
import { sendArkMoneyEmail } from "./email";

// Money an admin posts to a client's ARK account by hand: credit in/out, adjustment, bonus.
// The row is written first and its id goes to ARK as requestReference, so ARK itself refuses a
// second post of the same transaction (a double click, a retry after a timeout).

/** `recorded`: a transaction row exists, so the form must not offer the same values again. */
export type MoneyResult = { success?: string; warning?: string; error?: string; recorded?: boolean };

const MAX_AMOUNT = 10_000_000;
const REFERENCE_USED = /reference already used/i;
/** A transaction still sending after this was cut off and may be retried. */
export const STUCK_MS = 2 * 60_000;

export const isManualType = (n: number): n is ManualMoneyType => n in MANUAL_MONEY_TYPES;

/** Checks the form values; adjustments may be negative, everything else is a positive amount. */
export function checkMoneyInput(type: number, rawAmount: string) {
  if (!isManualType(type)) return { error: "Choose a transaction type." };
  const text = rawAmount.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return { error: "Enter an amount with up to 2 decimals." };
  const amount = Number(text);
  if (amount === 0) return { error: "Enter an amount other than 0." };
  if (amount < 0 && type !== 5) return { error: "Only an adjustment can be negative. Use Credit out to remove credit." };
  if (Math.abs(amount) > MAX_AMOUNT) return { error: `The most one transaction can be is ${MAX_AMOUNT.toLocaleString("en-US")}.` };
  return { type, amount };
}

async function send(id: string): Promise<MoneyResult> {
  const row = await db.arkMoneyTransaction.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { email: true, firstName: true, currency: true } } },
  });
  const type = row.type as ManualMoneyType;
  const amount = Number(row.amount);
  const name = MANUAL_MONEY_TYPES[type];

  let arkTrxId: string | null = null;
  try {
    const config = await loadArkConfig();
    arkTrxId = await postArkMoney(config, {
      arkUserId: row.arkUserId,
      type,
      amount,
      // Starts with "Bivora" so Money flow tags it as made in Bivora.
      comment: `Bivora ${name.toLowerCase()}${row.comment ? `: ${row.comment}` : ""}`.slice(0, 250),
      reference: row.id,
    });
  } catch (e) {
    if (!(e instanceof ArkError)) throw e;
    // A retry ARK has already seen: the first attempt went through.
    if (!REFERENCE_USED.test(e.message)) {
      // No reply at all means ARK may or may not have it; anything else is a clear refusal.
      const unknown = /could not reach ark/i.test(e.message);
      await db.arkMoneyTransaction.update({ where: { id }, data: { status: unknown ? "CHECK" : "FAILED", error: e.message } });
      return {
        error: unknown
          ? "ARK didn't answer, so it isn't known whether this went through. Check the ARK list below, then use Retry: it can never post twice."
          : e.message,
      };
    }
  }
  await db.arkMoneyTransaction.update({ where: { id }, data: { status: "DONE", error: null, ...(arkTrxId && { arkTrxId }) } });

  try {
    await sendArkMoneyEmail(row.user, { type, amount, note: row.comment });
    await db.arkMoneyTransaction.update({ where: { id }, data: { emailSentAt: new Date() } });
  } catch (e) {
    console.error("ARK money email failed", id, e instanceof Error ? e.message : "");
    return { warning: `${name} posted to ARK, but the email to the client didn't send.` };
  }
  return { success: `${name} posted to ARK and the client was emailed.` };
}

/** Records and posts a new transaction. `key` comes from the form, so a double submit is one row. */
export async function postManualMoney(input: { key: string; adminId: string; userId: string; type: number; amount: string; note: string }): Promise<MoneyResult> {
  if (!/^[a-z0-9]{20,40}$/i.test(input.key)) return { error: "Reload the page and try again." };
  const checked = checkMoneyInput(input.type, input.amount);
  if ("error" in checked) return { error: checked.error };
  const note = input.note.trim().slice(0, 200) || null;

  const client = await db.user.findFirst({
    where: { id: input.userId, role: "USER", arkUserId: { not: null } },
    select: { id: true, arkUserId: true },
  });
  if (!client?.arkUserId) return { error: "Choose a client with an ARK account." };

  try {
    await db.arkMoneyTransaction.create({
      data: { id: input.key, userId: client.id, arkUserId: client.arkUserId, type: checked.type, amount: checked.amount, comment: note, adminId: input.adminId, attemptAt: new Date() },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "This transaction was already submitted. See the list below.", recorded: true };
    }
    throw e;
  }
  return { ...(await send(input.key)), recorded: true };
}

/** Sends a failed or unconfirmed transaction again with the same reference. */
export async function retryManualMoney(id: string): Promise<MoneyResult> {
  // Claimed first, so two retries at once send it once.
  const { count } = await db.arkMoneyTransaction.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["FAILED", "CHECK"] } },
        // Left sending by a request that never finished.
        { status: "PENDING", attemptAt: { lt: new Date(Date.now() - STUCK_MS) } },
      ],
    },
    data: { status: "PENDING", attemptAt: new Date() },
  });
  if (count === 0) return { error: "This transaction isn't waiting for a retry." };
  return send(id);
}

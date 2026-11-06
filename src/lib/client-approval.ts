import "server-only";
import { ArkError, generateArkPassword, missingArkSettings, provisionArkAccount, resetArkPassword } from "./ark/client";
import { countryByIso, parsePhone } from "./countries";
import { db } from "./db";
import { missingEmailSettings, sendTradingCredentials } from "./email";
import { isKycComplete } from "./kyc";

export type ApprovalResult = { error?: string; warning?: string };

const EMAIL_FAILED = "The ARK account is ready, but the email didn't send. Use Resend login details.";
// An approval that hasn't finished by now was interrupted, so another attempt may take over.
const STALE_MS = 2 * 60 * 1000;

function setupError() {
  const missing = [...missingArkSettings(), ...missingEmailSettings()];
  return missing.length ? `Approval needs these settings first: ${missing.join(", ")}.` : null;
}

async function emailCredentials(
  userId: string,
  client: { email: string; firstName: string; username: string; password: string },
) {
  try {
    await sendTradingCredentials(client);
  } catch (e) {
    console.error("Credentials email failed", userId, e instanceof Error ? e.message : "");
    return false;
  }
  await db.user.update({ where: { id: userId }, data: { arkCredentialsSentAt: new Date() } });
  return true;
}

/** Creates the client's ARK account, opens their Bivora account, and emails their trading login. */
export async function approveClient(userId: string): Promise<ApprovalResult> {
  const notReady = setupError();
  if (notReady) return { error: notReady };

  const user = await db.user.findFirst({
    where: { id: userId, role: "USER" },
    include: { kycDocuments: { select: { type: true, slot: true, mimeType: true } } },
  });
  if (!user) return { error: "Client not found." };
  if (!user.termsAcceptedAt || !isKycComplete(user.kycDocuments)) {
    return { error: "This client hasn't finished their documents and terms." };
  }

  // Claimed first, so two admins approving at once can't both create an account.
  const { count } = await db.user.updateMany({
    where: {
      id: userId,
      OR: [{ kycStatus: "PENDING" }, { kycStatus: "APPROVING", kycReviewedAt: { lt: new Date(Date.now() - STALE_MS) } }],
    },
    data: { kycStatus: "APPROVING", kycNote: null, kycReviewedAt: new Date() },
  });
  if (count === 0) return { error: "These documents have already been reviewed, or are being approved." };

  const password = generateArkPassword();
  let account;
  try {
    account = await provisionArkAccount(
      { ...user, country: user.country ?? countryByIso(parsePhone(user.phone).iso).name },
      password,
    );
  } catch (e) {
    await db.user.update({ where: { id: userId }, data: { kycStatus: "PENDING", kycReviewedAt: null } });
    if (e instanceof ArkError) return { error: `${e.message} The client is still waiting for approval.` };
    throw e;
  }

  await db.user.update({
    where: { id: userId },
    data: { kycStatus: "APPROVED", kycReviewedAt: new Date(), ...account },
  });

  const sent = await emailCredentials(userId, {
    email: user.email,
    firstName: user.firstName,
    username: account.arkUsername,
    password,
  });
  return sent ? {} : { warning: EMAIL_FAILED };
}

/** Passwords are never stored, so resending always sets a new one on ARK first. */
export async function resendCredentials(userId: string): Promise<ApprovalResult> {
  const notReady = setupError();
  if (notReady) return { error: notReady };

  const user = await db.user.findFirst({ where: { id: userId, role: "USER", kycStatus: "APPROVED" } });
  if (!user?.arkUserId || !user.arkUsername) return { error: "This client has no ARK account yet." };

  const password = generateArkPassword();
  try {
    await resetArkPassword(user.arkUserId, password);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const sent = await emailCredentials(userId, {
    email: user.email,
    firstName: user.firstName,
    username: user.arkUsername,
    password,
  });
  return sent ? {} : { warning: "ARK has a new password, but the email didn't send. Please try again." };
}

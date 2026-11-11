import "server-only";
import { ArkError, type ArkConfig, generateArkPassword, loadArkConfig, provisionArkAccount, resetArkPassword } from "./ark/client";
import { countryByIso, parsePhone } from "./countries";
import { db } from "./db";
import { decryptSecret } from "./secrets";
import { missingEmailSettings, sendTradingCredentials } from "./email";
import { isKycComplete } from "./kyc";

export type ApprovalResult = { error?: string; warning?: string };

const EMAIL_FAILED = "The ARK account is ready, but the email didn't send. Use Resend login details.";
// An approval that hasn't finished by now was interrupted, so another attempt may take over.
const STALE_MS = 2 * 60 * 1000;

/** Everything approval depends on, checked up front so nothing happens halfway. */
async function prepare(): Promise<{ config: ArkConfig } | { error: string }> {
  const missing = missingEmailSettings();
  if (missing.length) return { error: `Approval needs these settings first: ${missing.join(", ")}.` };
  try {
    return { config: await loadArkConfig() };
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
}

async function emailCredentials(
  userId: string,
  client: { email: string; firstName: string; username: string; password: string | null; tradingUrl: string },
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
  const ready = await prepare();
  if ("error" in ready) return ready;

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

  // Opened by an admin with its ARK account already made: approval only marks the documents as checked.
  if (user.arkUserId) {
    await db.user.update({ where: { id: userId }, data: { kycStatus: "APPROVED", kycReviewedAt: new Date() } });
    return {};
  }

  // An admin who opened the account chose the client's password: their ARK account gets the same one.
  let chosen: string | null = null;
  if (user.arkPasswordEnc) {
    try {
      chosen = decryptSecret(user.arkPasswordEnc);
    } catch {
      chosen = null;
    }
  }
  const password = chosen ?? generateArkPassword();
  let account;
  try {
    account = await provisionArkAccount(
      ready.config,
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
    data: { kycStatus: "APPROVED", kycReviewedAt: new Date(), ...account, arkPasswordEnc: null },
  });

  const sent = await emailCredentials(userId, {
    email: user.email,
    firstName: user.firstName,
    username: account.arkUsername,
    // The same as their Bivora password, which they already know: never sent by email.
    password: chosen ? null : password,
    tradingUrl: ready.config.tradingUrl,
  });
  return sent ? {} : { warning: EMAIL_FAILED };
}

/** Passwords are never stored, so resending always sets a new one on ARK first. */
export async function resendCredentials(userId: string): Promise<ApprovalResult> {
  const ready = await prepare();
  if ("error" in ready) return ready;

  const user = await db.user.findFirst({ where: { id: userId, role: "USER", kycStatus: "APPROVED" } });
  if (!user?.arkUserId || !user.arkUsername) return { error: "This client has no ARK account yet." };

  const password = generateArkPassword();
  try {
    await resetArkPassword(ready.config, user.arkUserId, password);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  const sent = await emailCredentials(userId, {
    email: user.email,
    firstName: user.firstName,
    username: user.arkUsername,
    password,
    tradingUrl: ready.config.tradingUrl,
  });
  return sent ? {} : { warning: "ARK has a new password, but the email didn't send. Please try again." };
}

/**
 * For a client an admin opened: creates their ARK account now with the password the admin chose
 * (the same as their Bivora password) and emails their trading login. Documents and approval follow.
 */
export async function openArkAccountNow(userId: string): Promise<ApprovalResult> {
  const ready = await prepare();
  if ("error" in ready) return ready;
  const user = await db.user.findFirst({ where: { id: userId, role: "USER" } });
  if (!user) return { error: "Client not found." };
  if (user.arkUserId) return { error: "This client already has an ARK account." };
  if (!user.arkPasswordEnc) return { error: "This client chose their own password, so their ARK account opens when you approve them." };

  let password: string;
  try {
    password = decryptSecret(user.arkPasswordEnc);
  } catch {
    return { error: "The saved password couldn't be read. Their ARK account will open when you approve them." };
  }
  let account;
  try {
    account = await provisionArkAccount(ready.config, { ...user, country: user.country ?? countryByIso(parsePhone(user.phone).iso).name }, password);
  } catch (e) {
    if (e instanceof ArkError) return { error: e.message };
    throw e;
  }
  await db.user.update({ where: { id: userId }, data: { ...account, arkPasswordEnc: null } });

  const sent = await emailCredentials(userId, {
    email: user.email,
    firstName: user.firstName,
    username: account.arkUsername,
    // The same as their Bivora password: never sent by email.
    password: null,
    tradingUrl: ready.config.tradingUrl,
  });
  return sent ? {} : { warning: EMAIL_FAILED };
}

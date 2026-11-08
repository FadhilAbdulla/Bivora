import "server-only";
import { randomInt } from "node:crypto";
import { db } from "../db";
import { SecretKeyError, decryptSecret } from "../secrets";

// Creates client accounts on ARK when a super admin approves them. The connection details are
// managed at /admin/settings and read fresh each time, so a new dealer password applies at once.
// Endpoint reference: docs/ark-api.md

export class ArkError extends Error {}

export type ArkConfig = {
  apiUrl: string;
  companyName: string;
  dealerUsername: string;
  dealerPassword: string;
  parentId: number;
  genericPolicyId: number;
  currenciesPolicyId: number;
  tradingUrl: string;
};

/** ARK's account currency for every Bivora client. Always 1 on this broker. */
export const ARK_USER_CURRENCY_ID = 1;

export async function loadArkConfig(): Promise<ArkConfig> {
  const saved = await db.arkSettings.findUnique({ where: { id: "ark" } });
  if (!saved) throw new ArkError("Add the ARK connection details under ARK settings first.");
  const { dealerPasswordEnc, apiUrl, companyName, dealerUsername, parentId, genericPolicyId, currenciesPolicyId, tradingUrl } = saved;
  try {
    return {
      apiUrl,
      companyName,
      dealerUsername,
      parentId,
      genericPolicyId,
      currenciesPolicyId,
      tradingUrl,
      dealerPassword: decryptSecret(dealerPasswordEnc),
    };
  } catch (e) {
    if (e instanceof SecretKeyError) throw new ArkError(e.message);
    throw e;
  }
}

type Envelope<T> = { data?: T; message?: string; success?: boolean };

export async function arkFetch<T>(config: ArkConfig, path: string, init: RequestInit & { token?: string }) {
  const { token, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl.replace(/\/$/, "")}${path}`, {
      ...rest,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    });
  } catch {
    throw new ArkError("Could not reach ARK.");
  }
  const body: Envelope<T> | null = await response.json().catch(() => null);
  return { ok: response.ok && body?.success !== false, status: response.status, data: body?.data, message: body?.message };
}

export async function loginDealer(config: ArkConfig) {
  const result = await arkFetch<{ token?: string }>(config, "/login/public/api/v2/login", {
    method: "POST",
    body: JSON.stringify({
      companyName: config.companyName,
      userName: config.dealerUsername,
      password: config.dealerPassword,
    }),
  });
  if (!result.ok || !result.data?.token) throw new ArkError(`ARK login failed: ${result.message ?? result.status}`);
  return result.data.token;
}

type ArkUser = { userID?: number; userId?: number; id?: number; accountID?: number; accountId?: number };

async function findByUsername(config: ArkConfig, token: string, username: string) {
  const result = await arkFetch<ArkUser>(config, `/admin/public/api/v2/username/${encodeURIComponent(username)}`, {
    method: "GET",
    token,
  });
  if (!result.ok || !result.data) return null;
  const { userID, userId, id, accountID, accountId } = result.data;
  const arkUserId = userID ?? userId ?? id;
  return arkUserId == null ? null : { arkUserId: String(arkUserId), arkAccountId: String(accountID ?? accountId ?? "") || null };
}

async function setPassword(config: ArkConfig, token: string, arkUserId: string, password: string) {
  const result = await arkFetch(config, `/admin/public/api/v2/user/${arkUserId}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ password, forceChangePassword: true }),
  });
  if (!result.ok) throw new ArkError(`ARK couldn't set the password: ${result.message ?? result.status}`);
}

/** Letters and digits only, skipping lookalikes, because clients often type this from an email. */
export function generateArkPassword() {
  const sets = ["ABCDEFGHJKMNPQRSTUVWXYZ", "abcdefghjkmnpqrstuvwxyz", "23456789"];
  const all = sets.join("");
  const chars = [...sets, ...Array<string>(9).fill(all)].map((set) => set[randomInt(set.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Derived from the client's id, so a retried approval finds the same ARK account instead of creating another. */
export function arkUsernameFor(userId: string) {
  return `bv${userId.slice(-10).toLowerCase()}`;
}

export async function provisionArkAccount(config: ArkConfig, client: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string;
}, password: string) {
  const token = await loginDealer(config);
  const username = arkUsernameFor(client.id);

  const existing = await findByUsername(config, token, username);
  if (existing) {
    await setPassword(config, token, existing.arkUserId, password);
    return { ...existing, arkUsername: username };
  }

  const created = await arkFetch(config, "/admin/public/api/v2/user", {
    method: "POST",
    token,
    body: JSON.stringify({
      userType: 1,
      tradingType: 1,
      isDemo: false,
      isLocked: false,
      isVerified: true,
      accountID: -1,
      parentId: config.parentId,
      genericPolicyID: config.genericPolicyId,
      currenciesPolicyID: config.currenciesPolicyId,
      userCurrencyId: ARK_USER_CURRENCY_ID,
      roboDealerPolicyId: -1,
      accountMirroringPolicyId: -1,
      accountMirroringAccountIds: [],
      username,
      password,
      forceChangePassword: true,
      // Bivora sends its own email with these details.
      sendCredentialsEmailToUser: false,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      mobile: client.phone ?? "",
      country: client.country,
      validateMoneyBeforeEntry: true,
      canCreateOrUpdateEntryOrder: true,
      // Deposits and withdrawals are requested through Bivora.
      enableDepositRequest: false,
      canTransferMoney: false,
      canTransferPosition: false,
      customData: { bivoraUserId: client.id },
    }),
  });
  if (!created.ok) throw new ArkError(`ARK couldn't create the account: ${created.message ?? created.status}`);

  const account = await findByUsername(config, token, username);
  if (!account) throw new ArkError("ARK created the account but didn't return its details. Try approving again.");
  return { ...account, arkUsername: username };
}

export async function resetArkPassword(config: ArkConfig, arkUserId: string, password: string) {
  await setPassword(config, await loginDealer(config), arkUserId, password);
}

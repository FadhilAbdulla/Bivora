import "server-only";
import { randomInt } from "node:crypto";
import { db } from "../db";
import { SecretKeyError, decryptSecret, encryptSecret } from "../secrets";

// Talks to ARK as the dealer. The connection details are managed at /admin/settings and read fresh
// each time, so a new dealer password applies at once.
//
// Sessions follow ARK's rules: one login, reused. ARK ends a session 60 minutes after its last
// request, and /api/cron/ark-heartbeat calls the heartbeat endpoint every 10 minutes to keep it
// open. The token is stored encrypted in ArkSettings so every server instance shares it.
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

type Envelope<T> = { data?: T; message?: string; success?: boolean; httpStatus?: number };

async function arkFetch<T>(config: ArkConfig, path: string, init: RequestInit & { token?: string }) {
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
  return {
    ok: response.ok && body?.success !== false,
    // ARK sometimes reports errors inside a 200 reply.
    status: body?.httpStatus && body.httpStatus >= 400 ? body.httpStatus : response.status,
    data: body?.data,
    message: body?.message,
  };
}

async function loginDealer(config: ArkConfig) {
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

// ---------- Session ----------

/** ARK ends a session 60 minutes after its last request; stop trusting a token a little earlier. */
const SESSION_IDLE_MS = 50 * 60_000;
/** How long another request may spend logging in before we try ourselves. */
const LOGIN_CLAIM_MS = 30_000;
let lastTouch = 0;

async function storedSession() {
  const row = await db.arkSettings.findUnique({
    where: { id: "ark" },
    select: { sessionTokenEnc: true, sessionUsedAt: true },
  });
  if (!row?.sessionTokenEnc || !row.sessionUsedAt) return null;
  try {
    return { token: decryptSecret(row.sessionTokenEnc), usedAt: row.sessionUsedAt };
  } catch {
    return null;
  }
}

const isLive = (s: { usedAt: Date } | null) => Boolean(s && Date.now() - s.usedAt.getTime() < SESSION_IDLE_MS);

/** Logs in once even when several requests need a session at the same moment. */
async function loginOnce(config: ArkConfig) {
  const started = new Date();
  const claim = await db.arkSettings.updateMany({
    where: { id: "ark", OR: [{ sessionLoginAt: null }, { sessionLoginAt: { lt: new Date(Date.now() - LOGIN_CLAIM_MS) } }] },
    data: { sessionLoginAt: started },
  });
  if (claim.count === 0) {
    // Someone else is logging in: use their session when it lands.
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const s = await storedSession();
      if (s && s.usedAt >= started) return s.token;
    }
    throw new ArkError("ARK is busy signing in. Try again in a moment.");
  }
  try {
    const token = await loginDealer(config);
    await db.arkSettings.update({
      where: { id: "ark" },
      data: { sessionTokenEnc: encryptSecret(token), sessionUsedAt: new Date(), sessionLoginAt: null },
    });
    lastTouch = Date.now();
    return token;
  } catch (e) {
    await db.arkSettings.update({ where: { id: "ark" }, data: { sessionLoginAt: null } });
    throw e;
  }
}

/** The saved session, or a new one. `stale` is a token ARK just refused. */
async function sessionToken(config: ArkConfig, stale?: string) {
  const s = await storedSession();
  if (s && isLive(s) && s.token !== stale) return s.token;
  return loginOnce(config);
}

/** ARK counts every request as activity, so record it (at most once a minute). */
async function touch(token: string) {
  if (Date.now() - lastTouch < 60_000) return;
  lastTouch = Date.now();
  const s = await storedSession();
  if (s?.token === token) await db.arkSettings.update({ where: { id: "ark" }, data: { sessionUsedAt: new Date() } });
}

const isAuthFailure = (r: { ok: boolean; status: number; message?: string }) =>
  r.status === 401 || (!r.ok && /(session|token).{0,20}(expired|invalid|not valid)|unauthori[sz]ed|log ?in again/i.test(r.message ?? ""));

/** An authenticated request on the shared session, logging in again once if ARK has ended it. */
export async function arkRequest<T>(config: ArkConfig, path: string, init: RequestInit = {}) {
  let token = await sessionToken(config);
  let result = await arkFetch<T>(config, path, { ...init, token });
  if (isAuthFailure(result)) {
    token = await sessionToken(config, token);
    result = await arkFetch<T>(config, path, { ...init, token });
  }
  if (!isAuthFailure(result)) await touch(token);
  return result;
}

/** Makes sure there is a session, logging in only if needed. */
export async function ensureArkSession(config: ArkConfig) {
  await sessionToken(config);
}

/** Signs in now and keeps the session, for the Test connection button. */
export async function connectArk(config: ArkConfig) {
  await loginOnce(config);
}

/**
 * Keeps the saved session open. Never logs in: if there is no session, the next real request
 * makes one, so a wrong password can't trigger a login every 10 minutes.
 */
export async function arkHeartbeat(): Promise<"ok" | "no-session" | "ended"> {
  const saved = await db.arkSettings.findUnique({ where: { id: "ark" } });
  if (!saved) return "no-session";
  const s = await storedSession();
  if (!s || !isLive(s)) return "no-session";
  const config = await loadArkConfig();
  const result = await arkFetch(config, "/admin/public/api/v2/heartbeat", { method: "GET", token: s.token });
  if (isAuthFailure(result)) {
    await db.arkSettings.updateMany({ where: { id: "ark", sessionUsedAt: s.usedAt }, data: { sessionTokenEnc: null, sessionUsedAt: null } });
    return "ended";
  }
  if (!result.ok) throw new ArkError(`ARK heartbeat failed: ${result.message ?? result.status}`);
  await db.arkSettings.update({ where: { id: "ark" }, data: { sessionUsedAt: new Date() } });
  return "ok";
}

type ArkUser = { userID?: number; userId?: number; id?: number; accountID?: number; accountId?: number };

async function findByUsername(config: ArkConfig, username: string) {
  const result = await arkRequest<ArkUser>(config, `/admin/public/api/v2/username/${encodeURIComponent(username)}`, {
    method: "GET",
  });
  if (!result.ok || !result.data) return null;
  const { userID, userId, id, accountID, accountId } = result.data;
  const arkUserId = userID ?? userId ?? id;
  return arkUserId == null ? null : { arkUserId: String(arkUserId), arkAccountId: String(accountID ?? accountId ?? "") || null };
}

async function setPassword(config: ArkConfig, arkUserId: string, password: string) {
  const result = await arkRequest(config, `/admin/public/api/v2/user/${arkUserId}`, {
    method: "PUT",
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
  const username = arkUsernameFor(client.id);

  const existing = await findByUsername(config, username);
  if (existing) {
    await setPassword(config, existing.arkUserId, password);
    return { ...existing, arkUsername: username };
  }

  const created = await arkRequest(config, "/admin/public/api/v2/user", {
    method: "POST",
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

  const account = await findByUsername(config, username);
  if (!account) throw new ArkError("ARK created the account but didn't return its details. Try approving again.");
  return { ...account, arkUsername: username };
}

export async function resetArkPassword(config: ArkConfig, arkUserId: string, password: string) {
  await setPassword(config, arkUserId, password);
}

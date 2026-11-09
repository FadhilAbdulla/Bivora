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

// The session is kept in memory too, so each ARK request doesn't need a database read (pages make
// dozens of ARK requests, and the database allows only a few connections at once). It's re-read
// from the database at most once a minute, or at once when ARK refuses the token.
type Session = { token: string; usedAt: Date };
let memory: (Session & { readAt: number }) | null = null;
const memoryMs = () => {
  const n = Number(process.env.ARK_SESSION_MEMORY_MS ?? 60_000);
  return Number.isFinite(n) && n >= 0 ? n : 60_000;
};
const remember = (s: Session | null) => {
  memory = s ? { ...s, readAt: Date.now() } : null;
  return s;
};

/** Drops this server's copy of the session, e.g. after the ARK settings change. */
export function forgetArkSession() {
  memory = null;
}

async function storedSession(fresh = false): Promise<Session | null> {
  if (!fresh && memory && Date.now() - memory.readAt < memoryMs()) return { token: memory.token, usedAt: memory.usedAt };
  const row = await db.arkSettings.findUnique({
    where: { id: "ark" },
    select: { sessionTokenEnc: true, sessionUsedAt: true },
  });
  if (!row?.sessionTokenEnc || !row.sessionUsedAt) return remember(null);
  try {
    return remember({ token: decryptSecret(row.sessionTokenEnc), usedAt: row.sessionUsedAt });
  } catch {
    return remember(null);
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
      const s = await storedSession(true);
      if (s && s.usedAt >= started) return s.token;
    }
    throw new ArkError("ARK is busy signing in. Try again in a moment.");
  }
  try {
    const token = await loginDealer(config);
    const usedAt = new Date();
    await db.arkSettings.update({
      where: { id: "ark" },
      data: { sessionTokenEnc: encryptSecret(token), sessionUsedAt: usedAt, sessionLoginAt: null },
    });
    remember({ token, usedAt });
    lastTouch = Date.now();
    return token;
  } catch (e) {
    await db.arkSettings.update({ where: { id: "ark" }, data: { sessionLoginAt: null } });
    throw e;
  }
}

/** The saved session, or a new one. `stale` is a token ARK just refused. */
async function sessionToken(config: ArkConfig, stale?: string) {
  // After a refusal, look in the database: another server may already have a newer session.
  const s = await storedSession(Boolean(stale));
  if (s && isLive(s) && s.token !== stale) return s.token;
  return loginOnce(config);
}

/** ARK counts every request as activity, so record it (at most once a minute). */
async function touch(token: string) {
  if (memory?.token === token) memory.usedAt = new Date();
  if (Date.now() - lastTouch < 60_000) return;
  lastTouch = Date.now();
  const s = await storedSession(true);
  if (s?.token === token) {
    const usedAt = new Date();
    await db.arkSettings.update({ where: { id: "ark" }, data: { sessionUsedAt: usedAt } });
    remember({ token, usedAt });
  }
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
  const s = await storedSession(true);
  if (!s || !isLive(s)) return "no-session";
  const config = await loadArkConfig();
  const result = await arkFetch(config, "/admin/public/api/v2/heartbeat", { method: "GET", token: s.token });
  if (isAuthFailure(result)) {
    await db.arkSettings.updateMany({ where: { id: "ark", sessionUsedAt: s.usedAt }, data: { sessionTokenEnc: null, sessionUsedAt: null } });
    forgetArkSession();
    return "ended";
  }
  if (!result.ok) throw new ArkError(`ARK heartbeat failed: ${result.message ?? result.status}`);
  const usedAt = new Date();
  await db.arkSettings.update({ where: { id: "ark" }, data: { sessionUsedAt: usedAt } });
  remember({ token: s.token, usedAt });
  return "ok";
}

type ArkUser = {
  userID?: number;
  userId?: number;
  id?: number;
  accountID?: number;
  accountId?: number;
  username?: string;
  userName?: string;
  email?: string;
  customData?: { bivoraUserId?: unknown } | null;
};

/** ARK's user lookup returns the user, or a list of users; pick the one with this username. */
function lookupUser(data: unknown, username: string): ArkUser | null {
  if (!data || typeof data !== "object") return null;
  const list = Array.isArray(data) ? data : Array.isArray((data as { users?: unknown }).users) ? (data as { users: unknown[] }).users : [data];
  const users = list.filter((u): u is ArkUser => typeof u === "object" && u !== null);
  const wanted = username.toLowerCase();
  return users.find((u) => (u.username ?? u.userName ?? "").toLowerCase() === wanted) ?? (users.length === 1 ? users[0] : null);
}

/**
 * The ARK user with this username, or null when ARK says there is none. Any other failure throws,
 * so a broken lookup is never mistaken for a free username.
 */
async function findByUsername(config: ArkConfig, username: string) {
  const result = await arkRequest<unknown>(config, `/admin/public/api/v2/username/${encodeURIComponent(username)}`, {
    method: "GET",
  });
  if (!result.ok) {
    if (result.status === 404 || /not ?found|does ?n.t exist|no (such )?user/i.test(result.message ?? "")) return null;
    throw new ArkError(`ARK couldn't check the username: ${result.message ?? result.status}`);
  }
  const user = lookupUser(result.data, username);
  if (!user) return null;
  const arkUserId = user.userID ?? user.userId ?? user.id;
  if (arkUserId == null) return null;
  return {
    arkUserId: String(arkUserId),
    arkAccountId: String(user.accountID ?? user.accountId ?? "") || null,
    owner: { bivoraUserId: typeof user.customData?.bivoraUserId === "string" ? user.customData.bivoraUserId : null, email: user.email ?? null },
  };
}

/** Whether an ARK account was opened by Bivora for this client (its tag, or failing that its email). */
function belongsTo(owner: { bivoraUserId: string | null; email: string | null }, client: { id: string; email: string }) {
  if (owner.bivoraUserId) return owner.bivoraUserId === client.id;
  return !!owner.email && owner.email.toLowerCase() === client.email.toLowerCase();
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

/** Before random usernames: kept so an approval interrupted under the old scheme still finds its account. */
function legacyUsername(userId: string) {
  return `bv${userId.slice(-10).toLowerCase()}`;
}

/** The client's first name in plain letters, e.g. "Fadhil" (accents dropped), or "Client" if none are left. */
function usernameBase(firstName: string) {
  const letters = firstName.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 16);
  return letters ? letters[0].toUpperCase() + letters.slice(1).toLowerCase() : "Client";
}

/** First name plus 4 random digits (5 if the 4-digit ones keep colliding), unused in ARK and in Bivora. */
async function pickUsername(config: ArkConfig, firstName: string) {
  const base = usernameBase(firstName);
  for (let attempt = 0; attempt < 15; attempt++) {
    const digits = attempt < 10 ? 4 : 5;
    const name = `${base}${randomInt(10 ** (digits - 1), 10 ** digits)}`;
    const inBivora = await db.user.findFirst({ where: { arkUsername: { equals: name, mode: "insensitive" } }, select: { id: true } });
    if (inBivora) continue;
    if (!(await findByUsername(config, name))) return name;
  }
  throw new ArkError("Couldn't find a free ARK username. Try approving again.");
}

/** The broker's standard settings for a new real client. Office, policies and identity are added per client. */
const CREATE_CLIENT_DEFAULTS = {
  accountID: -1,
  accountMirroringAccountIds: [],
  accountMirroringPolicyId: -1,
  address: "",
  currencySign: "",
  accountIdPrefix: "",
  clientPriceExecution: false,
  canTransferMoney: false,
  canTransferPosition: false,
  forceChangePassword: false,
  ignoreLiquidation: false,
  isAllowMultiSession: true,
  isDemo: false,
  isLocked: false,
  percentageLevel1: 100.0,
  percentageLevel2: 100.0,
  percentageLevel3: 100.0,
  percentageLevel4: 100.0,
  creditLoanPercentage: 0.0,
  roboDealerPolicyId: -1,
  telephonePass: "",
  tradingType: 1,
  userCurrencyId: ARK_USER_CURRENCY_ID,
  userType: 1,
  validateMoneyBeforeClose: false,
  validateMoneyBeforeEntry: true,
  closeOnly: false,
  openOnly: false,
  noSellAtLoss: false,
  enableCashDelivery: false,
  enableDepositRequest: false,
  canCreateOrUpdateEntryOrder: true,
  // Bivora emails the login details itself, so ARK's own email would be a duplicate.
  sendCredentialsEmailToUser: false,
  blockFrequentTradesSeconds: 0,
  isVerified: true,
  ignoreBlockTradeIfInLoss: false,
  userWhiteListIps: [],
  enableApi: false,
  chargeMarginForEntry: false,
  assignAgentToMySelf: false,
};

export async function provisionArkAccount(config: ArkConfig, client: {
  id: string;
  /** A username kept from an earlier, interrupted approval. */
  arkUsername: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string;
}, password: string) {
  // An interrupted approval may already have created the account: reuse it instead of making another.
  for (const name of [client.arkUsername, legacyUsername(client.id)]) {
    if (!name) continue;
    const existing = await findByUsername(config, name);
    if (existing && belongsTo(existing.owner, client)) {
      await setPassword(config, existing.arkUserId, password);
      return { arkUserId: existing.arkUserId, arkAccountId: existing.arkAccountId, arkUsername: name };
    }
    // Someone else took the kept name in ARK meanwhile: pick a new one below.
    if (existing && name === client.arkUsername) client = { ...client, arkUsername: null };
  }

  // Kept on the client before ARK sees it, so a retry after a cut-off request finds this account.
  const username = client.arkUsername ?? (await pickUsername(config, client.firstName));
  if (username !== client.arkUsername) await db.user.update({ where: { id: client.id }, data: { arkUsername: username } });

  const created = await arkRequest(config, "/admin/public/api/v2/user", {
    method: "POST",
    body: JSON.stringify({
      ...CREATE_CLIENT_DEFAULTS,
      parentId: config.parentId,
      genericPolicyID: config.genericPolicyId,
      currenciesPolicyID: config.currenciesPolicyId,
      username,
      password,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      mobile: client.phone ?? "",
      country: client.country,
      customData: { bivoraUserId: client.id },
    }),
  });
  if (!created.ok) throw new ArkError(`ARK couldn't create the account: ${created.message ?? created.status}`);

  const account = await findByUsername(config, username);
  if (!account) throw new ArkError("ARK created the account but didn't return its details. Try approving again.");
  return { arkUserId: account.arkUserId, arkAccountId: account.arkAccountId, arkUsername: username };
}

export async function resetArkPassword(config: ArkConfig, arkUserId: string, password: string) {
  await setPassword(config, arkUserId, password);
}

// ---------- Money transactions ----------

/** ARK's trxType values an admin may post by hand from Money flow. */
export const MANUAL_MONEY_TYPES = { 1: "Deposit", 2: "Withdrawal", 3: "Credit in", 4: "Credit out", 5: "Adjustment", 6: "Bonus" } as const;
export type ManualMoneyType = keyof typeof MANUAL_MONEY_TYPES;

/** ARK's date format: the server's local time, `yyyy-MM-dd HH:mm:ss.SSS`. */
function arkTimestamp(date: Date) {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}.${p(date.getMilliseconds(), 3)}`;
}

/**
 * Posts one money transaction to a client's ARK account. `reference` must be unique: ARK refuses a
 * reference it has seen, so a retried request can never post twice. Returns ARK's transaction ID.
 */
export async function postArkMoney(
  config: ArkConfig,
  op: { arkUserId: string; type: ManualMoneyType; amount: number; comment: string; reference: string },
) {
  const result = await arkRequest<unknown>(config, "/admin/public/api/v2/money/transaction", {
    method: "POST",
    body: JSON.stringify({
      userId: Number(op.arkUserId),
      trxType: op.type,
      trxAmount: op.amount,
      trxComment: op.comment,
      message: op.comment,
      trxDate: arkTimestamp(new Date()),
      requestReference: op.reference,
    }),
  });
  if (!result.ok) throw new ArkError(`ARK refused the transaction: ${result.message ?? result.status}`);
  // ARK sends its result as a JSON string: {"data":{"trxId":…}}.
  let trxId: string | null = null;
  try {
    const data = typeof result.data === "string" ? JSON.parse(result.data) : result.data;
    const id = data?.data?.trxId ?? data?.trxId;
    if (id != null) trxId = String(id);
  } catch {
    // The transaction went through; only its ID is unreadable.
  }
  return trxId;
}

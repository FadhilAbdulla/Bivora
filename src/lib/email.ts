import "server-only";
import { after } from "next/server";
import { siteUrl } from "./brand";
import { formatMoney } from "./money";

// Transactional email through Resend. Swapping providers only means changing sendEmail().

const REQUIRED_ENV = ["RESEND_API_KEY", "EMAIL_FROM"] as const;
const SUPPORT = "support@bivoramarkets.com";
const RISK = "Trading involves risk. Only trade with money you can afford to lose.";

export function missingEmailSettings() {
  return REQUIRED_ENV.filter((key) => !process.env[key]);
}

/** Runs after the response, so a slow or failing email never holds up the client. */
export function sendLater(label: string, send: () => Promise<void>) {
  if (missingEmailSettings().length) return;
  after(() =>
    send().catch((e) => console.error(`${label} email failed`, e instanceof Error ? e.message : "")),
  );
}

async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, reply_to: SUPPORT, ...message }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ---------- Layout ----------
// Tables and inline styles only: that is what Gmail, Outlook and Apple Mail all render the same.

const C = {
  page: "#eef2f0",
  header: "#070908",
  card: "#ffffff",
  text: "#33423c",
  heading: "#0b1a15",
  muted: "#6b7a74",
  line: "#dfe7e3",
  brand: "#126f69",
  accent: "#23ae80",
  gold: "#d4b35f",
  soft: "#f4f8f6",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
/** PNG, because many mail apps (Gmail included) don't show SVG. */
const LOGO_URL = `${siteUrl}/brand/bivora-logo-email.png`;

const paragraph = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">${html}</p>`;
const note = (html: string) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:${C.muted};">${html}</p>`;

/** A button that keeps its shape in Outlook too. */
const button = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:${C.brand};">` +
  `<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}&nbsp;&rarr;</a>` +
  `</td></tr></table>`;

/** Numbered steps, for what the client does next. */
const steps = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:4px 0 20px;">` +
  items
    .map(
      (item, i) =>
        `<tr><td style="width:28px;padding:0 12px 12px 0;vertical-align:top;"><div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${C.soft};border:1px solid ${C.line};text-align:center;font-size:13px;font-weight:700;color:${C.brand};">${i + 1}</div></td>` +
        `<td style="padding:3px 0 12px;font-size:15px;line-height:1.5;color:${C.text};vertical-align:top;">${item}</td></tr>`,
    )
    .join("") +
  `</table>`;

/** `title` and `preheader` are plain text; `body` is HTML built from escaped values. */
function layout(title: string, body: string, preheader: string) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};font-family:${FONT};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

<tr><td style="background:${C.header};border-radius:16px 16px 0 0;padding:22px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO_URL}" width="44" height="44" alt="Bivora" style="display:block;border:0;width:44px;height:44px;"></td>
<td style="vertical-align:middle;padding-left:12px;"><span style="font-size:21px;font-weight:700;letter-spacing:0.2px;color:#ffffff;">Bivora</span><br><span style="font-size:11px;font-weight:600;letter-spacing:2px;color:${C.gold};">MARKETS</span></td>
</tr></table>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${C.accent};">&nbsp;</td></tr>

<tr><td style="background:${C.card};border-radius:0 0 16px 16px;padding:36px 32px 28px;">
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;font-weight:700;color:${C.heading};">${escapeHtml(title)}</h1>
${body}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-top:1px solid ${C.line};"><tr><td style="padding-top:18px;">
${note(`Questions? Reply to this email or write to <a href="mailto:${SUPPORT}" style="color:${C.brand};font-weight:600;text-decoration:none;">${SUPPORT}</a>.`)}
<p style="margin:0;font-size:14px;color:${C.text};">The Bivora team</p>
</td></tr></table>
</td></tr>

<tr><td style="padding:22px 24px 0;text-align:center;">
<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${C.muted};">${RISK}</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:${C.muted};">&copy; ${year} Bivora &middot; <a href="${siteUrl}" style="color:${C.muted};text-decoration:underline;">bivoramarkets.com</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

export function sendWelcomeEmail(client: { email: string; firstName: string }) {
  const url = `${siteUrl}/onboarding`;
  return sendEmail({
    to: client.email,
    subject: "Welcome to Bivora",
    text: [
      `Hi ${client.firstName},`,
      "",
      "Welcome to Bivora. To open your account, upload your passport, Emirates ID and proof of address, then accept the terms.",
      "",
      "We'll review your documents and email your trading login once they're approved.",
      "",
      `Continue here: ${url}`,
      "",
      `Questions? Email ${SUPPORT}.`,
      "",
      RISK,
    ].join("\n"),
    html: layout(
      `Welcome to Bivora, ${client.firstName}`,
      paragraph("Thanks for signing up. Three quick steps open your account:") +
        steps(["Upload your passport and Emirates ID", "Add a proof of address", "Accept the terms"]) +
        button("Continue setting up", url) +
        note("We'll review your documents and email your trading login as soon as they're approved."),
      "Three quick steps to open your Bivora account.",
    ),
  });
}

export function sendPasswordResetEmail(client: { email: string; firstName: string; url: string }) {
  return sendEmail({
    to: client.email,
    subject: "Reset your Bivora password",
    text: [
      `Hi ${client.firstName},`,
      "",
      "Use this link to choose a new Bivora password. It works once and expires in 1 hour.",
      "",
      client.url,
      "",
      "If you didn't ask for this, you can ignore this email. Your account hasn't changed.",
      "",
      `Questions? Email ${SUPPORT}.`,
    ].join("\n"),
    html: layout(
      "Reset your password",
      paragraph(`Hi ${escapeHtml(client.firstName)}, use the button below to choose a new Bivora password.`) +
        button("Choose a new password", client.url) +
        note("The link works once and expires in 1 hour.") +
        note("Didn't ask for this? You can ignore this email. Your password hasn't changed."),
      "Choose a new Bivora password. The link expires in 1 hour.",
    ),
  });
}

export function sendTradingCredentials(client: {
  email: string;
  firstName: string;
  username: string;
  password: string;
  tradingUrl: string;
}) {
  const url = client.tradingUrl;
  const row = (label: string, value: string, last = false) =>
    `<tr><td style="padding:14px 18px;${last ? "" : `border-bottom:1px solid ${C.line};`}">` +
    `<p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">${label}</p>` +
    `<p style="margin:0;font-family:${MONO};font-size:18px;font-weight:700;letter-spacing:0.5px;color:${C.heading};">${escapeHtml(value)}</p></td></tr>`;

  return sendEmail({
    to: client.email,
    subject: "Your Bivora trading account is ready",
    text: [
      `Hi ${client.firstName},`,
      "",
      "Your documents have been approved and your Bivora trading account is ready.",
      "",
      `Username: ${client.username}`,
      `Temporary password: ${client.password}`,
      `Log in: ${url}`,
      "",
      "We recommend changing this password after you log in. Please don't share these details with anyone. Bivora will never ask for your password.",
      "",
      "These details are for the trading platform. Keep using your existing Bivora login for deposits and withdrawals.",
      "",
      `Questions? Email ${SUPPORT}.`,
      "",
      RISK,
      "",
      "The Bivora team",
    ].join("\n"),
    html: layout(
      "Your trading account is ready",
      paragraph(`Hi ${escapeHtml(client.firstName)}, good news: your documents are approved. Here are your login details for the trading platform.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;background:${C.soft};border:1px solid ${C.line};border-radius:12px;">${row("Username", client.username)}${row("Temporary password", client.password, true)}</table>` +
        button("Log in to trade", url) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td style="padding:12px 16px;background:#fbf6e7;border-left:3px solid ${C.gold};border-radius:6px;font-size:13px;line-height:1.55;color:#5c4a1c;">` +
        "We recommend changing this password after you log in. Please don't share these details with anyone. Bivora will never ask for your password." +
        `</td></tr></table>` +
        note("These details are for the trading platform. Keep using your existing Bivora login for deposits and withdrawals."),
      "Your trading login is inside. Your documents are approved.",
    ),
  });
}

/** What a money transaction did, in the client's words. Positive amounts add, negative ones take away. */
function describeMoney(type: number, amount: number, currency: string) {
  const value = formatMoney(Math.abs(amount), currency);
  switch (type) {
    case 3:
      return { subject: `${value} credit added to your account`, title: "Credit added", line: `Your trading account has been credited with <strong>${value}</strong> credit.`, added: true };
    case 4:
      return { subject: `${value} credit removed from your account`, title: "Credit removed", line: `<strong>${value}</strong> credit has been removed from your trading account.`, added: false };
    case 6:
      return { subject: `You've received a ${value} bonus`, title: "Bonus added", line: `Your trading account has been credited with a <strong>${value}</strong> bonus.`, added: true };
    default:
      return amount >= 0
        ? { subject: `${value} added to your account`, title: "Account adjusted", line: `Your trading account has been credited with <strong>${value}</strong> as an adjustment.`, added: true }
        : { subject: `${value} deducted from your account`, title: "Account adjusted", line: `<strong>${value}</strong> has been deducted from your trading account as an adjustment.`, added: false };
  }
}

export function sendArkMoneyEmail(client: { email: string; firstName: string; currency: string }, op: { type: number; amount: number; note?: string | null }) {
  const d = describeMoney(op.type, op.amount, client.currency);
  const plain = d.line.replace(/<\/?strong>/g, "");
  const value = formatMoney(Math.abs(op.amount), client.currency);
  return sendEmail({
    to: client.email,
    subject: d.subject,
    text: [
      `Hi ${client.firstName},`,
      "",
      plain,
      ...(op.note ? ["", `Note: ${op.note}`] : []),
      "",
      "It shows on the trading platform straight away.",
      "",
      `Questions? Email ${SUPPORT}.`,
      "",
      RISK,
      "",
      "The Bivora team",
    ].join("\n"),
    html: layout(
      d.title,
      paragraph(`Hi ${escapeHtml(client.firstName)}, ${d.line.charAt(0).toLowerCase()}${d.line.slice(1)}`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;background:${C.soft};border:1px solid ${C.line};border-radius:12px;"><tr><td style="padding:20px 18px;text-align:center;">` +
        `<p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted};">${escapeHtml(d.title)}</p>` +
        `<p style="margin:0;font-size:30px;font-weight:700;color:${d.added ? C.brand : "#b4423a"};">${d.added ? "+" : "&minus;"}${value}</p>` +
        `</td></tr></table>` +
        (op.note ? note(`Note: ${escapeHtml(op.note)}`) : "") +
        note("It shows on the trading platform straight away."),
      plain,
    ),
  });
}

import "server-only";
import { after } from "next/server";
import { siteUrl } from "./brand";

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

const paragraph = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;">${html}</p>`;
const button = (label: string, url: string) =>
  `<p style="margin:6px 0 22px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#126f69;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${label}</a></p>`;

function layout(title: string, body: string) {
  return `<div style="background:#f3f6f4;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#10201a;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px 28px;">
<p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#126f69;">Bivora</p>
<h1 style="margin:0 0 12px;font-size:20px;">${title}</h1>
${body}
${paragraph(`Questions? Email <a href="mailto:${SUPPORT}" style="color:#126f69;">${SUPPORT}</a>.`)}
<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#5f6b66;">${RISK}</p>
</div>
</div>`;
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
      "Welcome to Bivora",
      paragraph(`Hi ${escapeHtml(client.firstName)}, to open your account, upload your passport, Emirates ID and proof of address, then accept the terms.`) +
        paragraph("We'll review your documents and email your trading login once they're approved.") +
        button("Continue", url),
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
      paragraph(`Hi ${escapeHtml(client.firstName)}, use this button to choose a new Bivora password. It works once and expires in 1 hour.`) +
        button("Choose a new password", client.url) +
        paragraph("If you didn't ask for this, you can ignore this email. Your account hasn't changed."),
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
  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 14px;color:#5f6b66;font-size:14px;">${label}</td><td style="padding:10px 14px;font-family:Menlo,Consolas,monospace;font-size:15px;font-weight:600;color:#10201a;">${escapeHtml(value)}</td></tr>`;

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
      "You'll be asked to choose a new password the first time you log in. Please don't share these details with anyone. Bivora will never ask for your password.",
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
      paragraph(`Hi ${escapeHtml(client.firstName)}, your documents have been approved. Here are your login details for the trading platform.`) +
        `<table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f6f4;border-radius:8px;margin:0 0 20px;">${row("Username", client.username)}${row("Temporary password", client.password)}</table>` +
        button("Log in to trade", url) +
        paragraph("You'll be asked to choose a new password the first time you log in. Please don't share these details with anyone. Bivora will never ask for your password.") +
        paragraph("These details are for the trading platform. Keep using your existing Bivora login for deposits and withdrawals."),
    ),
  });
}

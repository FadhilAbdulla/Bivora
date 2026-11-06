import "server-only";

// Transactional email through Resend. Swapping providers only means changing sendEmail().

const REQUIRED_ENV = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

export function missingEmailSettings() {
  return REQUIRED_ENV.filter((key) => !process.env[key]);
}

async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function sendTradingCredentials(client: {
  email: string;
  firstName: string;
  username: string;
  password: string;
}) {
  const url = process.env.ARK_TRADING_URL!;
  const support = "support@bivoramarkets.com";
  const name = escapeHtml(client.firstName);
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
      `Questions? Email ${support}.`,
      "",
      "Trading involves risk. Only trade with money you can afford to lose.",
      "",
      "The Bivora team",
    ].join("\n"),
    html: `<div style="background:#f3f6f4;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#10201a;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px 28px;">
<p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#126f69;">Bivora</p>
<h1 style="margin:0 0 12px;font-size:20px;">Your trading account is ready</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Hi ${name}, your documents have been approved. Here are your login details for the trading platform.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f6f4;border-radius:8px;margin:0 0 20px;">
${row("Username", client.username)}
${row("Temporary password", client.password)}
</table>
<p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#126f69;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">Log in to trade</a></p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5;">You'll be asked to choose a new password the first time you log in. Please don't share these details with anyone. Bivora will never ask for your password.</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5;">These details are for the trading platform. Keep using your existing Bivora login for deposits and withdrawals.</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.5;">Questions? Email <a href="mailto:${support}" style="color:#126f69;">${support}</a>.</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#5f6b66;">Trading involves risk. Only trade with money you can afford to lose.</p>
</div>
</div>`,
  });
}

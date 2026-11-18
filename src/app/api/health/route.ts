// For Railway's health check: answers as soon as the server is up. The full check is the admin
// System health page.
export function GET() {
  return Response.json({ ok: true });
}

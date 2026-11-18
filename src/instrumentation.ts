// Runs once when the server starts.
//
// On Railway the app is one long-running server, so it keeps the ARK session open itself by calling
// its own heartbeat route every 10 minutes. On Vercel, Vercel Cron does that (vercel.json), so the
// timer stays off there.

const EVERY_MS = 10 * 60_000;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL) return;
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    console.warn("ARK heartbeat timer off: CRON_SECRET isn't set.");
    return;
  }
  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/cron/ark-heartbeat`;
  const beat = async () => {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (!res.ok) console.warn(`ARK heartbeat timer: ${res.status}`);
    } catch (e) {
      console.warn("ARK heartbeat timer failed", e instanceof Error ? e.message : "");
    }
  };
  // First beat once the server is up, then every 10 minutes.
  setTimeout(beat, 30_000);
  setInterval(beat, EVERY_MS).unref?.();
}

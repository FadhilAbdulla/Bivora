import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Card, CardHeader, PageHeader, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { runHealthCheck } from "@/lib/health";
import { formatDate } from "@/lib/money";
import { RerunButton } from "./rerun";

export const metadata: Metadata = { title: "System health" };

type Level = "good" | "slow" | "bad";
const rate = (ms: number, good: number, slow: number): Level => (ms <= good ? "good" : ms <= slow ? "slow" : "bad");
const LABEL: Record<Level, string> = { good: "Good", slow: "Slow", bad: "Very slow" };
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`);
const ago = (d: Date | null | undefined) => {
  if (!d) return "never";
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${formatDate(d)}`;
};

export default async function HealthPage() {
  await requireAdmin();
  const h = await runHealthCheck();
  const db = h.database;

  const dbLevel: Level = db.roundTripError ? "bad" : rate(db.median, 60, 250);
  const freshLevel: Level = db.fresh.error ? "bad" : rate(db.fresh.ms, 800, 3000);
  const cold = h.server.upSeconds < 60 && h.server.checksOnThisServer === 1;

  // Plain-language findings, worst first.
  const findings: { level: Level; text: string }[] = [];
  if (dbLevel !== "good") findings.push({ level: dbLevel, text: `Each database query takes about ${ms(db.median)}. A page runs several, so this alone adds seconds. Usually it means the database is far from the app server (${h.server.region}).` });
  if (freshLevel !== "good") findings.push({ level: freshLevel, text: `Opening a new database connection takes ${ms(db.fresh.ms)}. Every fresh server pays this before its first page, which is the slow first sign-in.` });
  if (h.ark.session && !h.ark.session.live) findings.push({ level: "slow", text: "There's no live ARK session, so the next ARK action has to sign in first. The heartbeat should keep one open." });
  if (cold) findings.push({ level: "slow", text: "This check ran on a server that had just started (a cold start), so its first numbers include start-up time. Run it again for warm numbers." });
  const worst: Level = findings.some((f) => f.level === "bad") ? "bad" : findings.length ? "slow" : "good";

  return (
    <>
      <PageHeader
        title="System health"
        description={`Measured live just now (${formatDate(h.checkedAt)}). Nothing is changed by a check.`}
        action={<RerunButton />}
      />

      <Card className={cn("mb-6 p-5", worst === "bad" ? "border-down/40" : worst === "slow" ? "border-warning/40" : "border-up/40")}>
        <p className="flex items-center gap-2 font-medium">
          <Dot level={worst} />
          {worst === "good" ? "Everything is responding quickly." : "What's slowing things down"}
        </p>
        {findings.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {findings.map((f, i) => (
              <li key={i} className="flex gap-2"><Dot level={f.level} className="mt-1.5" />{f.text}</li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Database" description="Time for the app server to reach the database and back." />
          <Rows>
            <Row label="One query (typical)" value={ms(db.median)} level={dbLevel} hint={`Five in a row: ${db.roundTrips.map(ms).join(", ")}`} />
            <Row label="First query of this check" value={ms(db.first.ms)} level={db.first.error ? "bad" : rate(db.first.ms, 100, 1000)} hint={db.first.error ?? "Higher when the pool had to open a connection."} />
            <Row label="8 queries at once" value={ms(db.parallel.ms)} level={db.parallel.error ? "bad" : rate(db.parallel.ms, 200, 1500)} hint={db.parallel.error ?? "Shows whether the connection pool keeps up."} />
            <Row label="Opening a new connection" value={ms(db.fresh.ms)} level={freshLevel} hint={db.fresh.error ?? "What a fresh server pays before its first page."} />
            <Row
              label="Connections in use"
              value={"error" in db.connections ? "—" : `${db.connections.inUse} of ${db.connections.max}`}
              level={"error" in db.connections ? "bad" : db.connections.inUse / db.connections.max > 0.8 ? "bad" : db.connections.inUse / db.connections.max > 0.5 ? "slow" : "good"}
              hint={"error" in db.connections ? db.connections.error : "Across every server; the app keeps up to 10 per server."}
            />
            {db.roundTripError && <Row label="Error" value="" level="bad" hint={db.roundTripError} />}
          </Rows>
        </Card>

        <Card>
          <CardHeader title="ARK" description="The shared dealer session. ARK isn't called by this check." />
          {!h.ark.configured ? (
            <p className="p-5 text-sm text-muted">ARK isn&apos;t set up yet.</p>
          ) : (
            <Rows>
              <Row
                label="Session"
                value={h.ark.session?.live ? "Open" : h.ark.session?.hasSession ? "Expired" : "None"}
                level={h.ark.session?.live ? "good" : "slow"}
                hint={`Last used ${ago(h.ark.session?.usedAt)}. The heartbeat keeps it open every 10 minutes.`}
              />
              {h.ark.session?.loginFailedAt && (
                <Row label="Last refused login" value={ago(h.ark.session.loginFailedAt)} level="bad" hint="ARK refused the dealer login. Check ARK settings." />
              )}
            </Rows>
          )}
        </Card>

        <Card>
          <CardHeader title="App server" description="The Vercel server that answered this check." />
          <Rows>
            <Row label="Region" value={h.server.region} hint="Where the app runs. It should be close to the database." />
            <Row
              label="Running for"
              value={h.server.upSeconds < 120 ? `${h.server.upSeconds} s` : `${Math.round(h.server.upSeconds / 60)} min`}
              level={cold ? "slow" : "good"}
              hint={cold ? "Just started: a cold start." : `Warm. Checks on this server: ${h.server.checksOnThisServer}.`}
            />
            <Row label="Node.js" value={h.server.node} />
          </Rows>
        </Card>

        <Card>
          <CardHeader title="Settings" description="Secrets set on Vercel (values never shown)." />
          <Rows>
            <Row setting label="Email" value={h.config.email.length ? "Missing" : "Set"} level={h.config.email.length ? "bad" : "good"} hint={h.config.email.join(", ") || undefined} />
            <Row setting label="Document storage" value={h.config.storage.length ? "Missing" : "Set"} level={h.config.storage.length ? "bad" : "good"} hint={h.config.storage.join(", ") || undefined} />
            <Row setting label="Encryption key" value={h.config.encryptionKey ? "Set" : "Missing"} level={h.config.encryptionKey ? "good" : "bad"} />
            <Row setting label="Heartbeat secret" value={h.config.cronSecret ? "Set" : "Missing"} level={h.config.cronSecret ? "good" : "bad"} hint={h.config.cronSecret ? undefined : "Add CRON_SECRET on Vercel, or the ARK heartbeat can't run."} />
          </Rows>
        </Card>
      </div>
    </>
  );
}

function Dot({ level, className }: { level: Level; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", level === "good" ? "bg-up" : level === "slow" ? "bg-warning" : "bg-down", className)}
    />
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line">{children}</dl>;
}

function Row({ label, value, level, hint, setting }: { label: string; value: string; level?: Level; hint?: string; setting?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm sm:px-5">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <dt>{label}</dt>
        {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
      </div>
      <dd className="shrink-0 text-right">
        <p className="font-mono tabular-nums">{value}</p>
        {level && (
          <p className={cn("text-xs", level === "good" ? "text-up" : level === "slow" ? "text-warning" : "text-down")}>{setting ? (level === "good" ? "OK" : "Missing") : LABEL[level]}</p>
        )}
      </dd>
    </div>
  );
}

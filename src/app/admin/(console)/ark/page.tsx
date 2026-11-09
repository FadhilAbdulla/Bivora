import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Card, CardHeader, EmptyState, PageHeader, StatCard, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { PendingArea, PendingLink } from "@/components/pending-nav";
import { OfficePicker } from "./office-picker";
import { accountIdOf, bivoraAccounts, bivoraClientFor, getArkOverview, isDemo, nameOf, parentIdOf, userIdOf } from "@/lib/ark/reports";

export const metadata: Metadata = { title: "ARK accounts" };

const CLIENTS_SHOWN = 300;

export default async function ArkAccountsPage({ searchParams }: PageProps<"/admin/ark">) {
  await requireAdmin();
  const { node: raw, source: rawSource } = await searchParams;
  const requested = typeof raw === "string" && /^\d{1,12}$/.test(raw) ? Number(raw) : undefined;
  const source = rawSource === "bivora" || rawSource === "ark" ? rawSource : "all";
  const [overview, accounts] = await Promise.all([getArkOverview(requested), bivoraAccounts()]);

  if ("error" in overview) {
    return (
      <>
        <PageHeader title="ARK accounts" description="Every client account in ARK, opened in Bivora or directly in ARK." />
        <Alert tone="error">{overview.error}</Alert>
        <p className="mt-3 text-sm">
          <Link href="/admin/settings" className="font-medium text-brand hover:underline">Check ARK settings</Link>
        </p>
      </>
    );
  }

  const { top, node, topInfo, offices, clients } = overview;
  const clientRows = clients.data?.rows ?? [];
  const demo = clientRows.filter(isDemo).length;
  // Opened by approving a client in Bivora, or created directly in ARK.
  const tagged = clientRows.map((row) => ({ row, bivora: bivoraClientFor(row, accounts) }));
  const fromBivora = tagged.filter((t) => t.bivora).length;
  const listed = tagged.filter((t) => source === "all" || (source === "bivora") === Boolean(t.bivora));
  const filterHref = (s: string) => `/admin/ark?${new URLSearchParams({ node: String(node), ...(s !== "all" && { source: s }) })}`;
  const topName = topInfo ? nameOf(topInfo) : "";
  const officeName = node === top ? `All offices${topName ? ` · ${topName}` : ""}` : (offices.find((o) => o.id === node)?.label ?? `Office ${node}`);

  return (
    <PendingArea>
      <PageHeader
        title="ARK accounts"
        description="Every client account in ARK, opened in Bivora or directly in ARK."
        action={<OfficePicker key={node} offices={offices} top={top} topName={topName} node={node} source={source === "all" ? undefined : source} />}
      />

      <p className="mb-4 text-sm text-muted">
        Showing <span className="font-medium text-foreground">{officeName}</span> <span className="font-mono">(ID {node})</span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Client accounts" value={count(clients)} />
        <StatCard label="Opened in Bivora" value={clients.data ? fromBivora.toLocaleString("en-US") : "—"} tone="brand" />
        <StatCard label="Opened in ARK" value={clients.data ? (clientRows.length - fromBivora).toLocaleString("en-US") : "—"} />
        <StatCard label="Real accounts" value={clients.data ? (clientRows.length - demo).toLocaleString("en-US") : "—"} tone="up" hint={clients.data ? `${demo.toLocaleString("en-US")} demo` : undefined} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Client accounts"
          description={
            listed.length > CLIENTS_SHOWN
              ? `Showing ${CLIENTS_SHOWN} of ${listed.length.toLocaleString("en-US")}. Tap an account for its details.`
              : "Every client account under this node, opened in Bivora or in ARK. Tap an account for its details."
          }
        />
        <nav aria-label="Filter accounts" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 sm:px-4">
          {[
            ["all", `All ${clientRows.length}`],
            ["bivora", `Opened in Bivora ${fromBivora}`],
            ["ark", `Opened in ARK ${clientRows.length - fromBivora}`],
          ].map(([value, text]) => (
            <PendingLink
              key={value}
              href={filterHref(value)}
              aria-current={source === value ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm",
                source === value ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {text}
            </PendingLink>
          ))}
        </nav>
        {clients.error ? (
          <div className="p-4 sm:p-5"><Alert tone="error">{clients.error}</Alert></div>
        ) : listed.length === 0 ? (
          <EmptyState title={source === "all" ? "No accounts under this node." : "No accounts match this filter."} />
        ) : (
          <ul className="divide-y divide-line">
            {listed.slice(0, CLIENTS_SHOWN).map(({ row: c, bivora }) => (
              <li key={userIdOf(c)} className="text-sm">
                {/* Tap a client for every detail ARK holds on them. */}
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p className="font-medium">{nameOf(c) || "Unnamed"}</p>
                      <p className="text-xs text-muted">
                        {typeof c.username === "string" && <>{c.username} · </>}
                        User {userIdOf(c)} · Account {accountIdOf(c) ?? "—"} · Office {parentIdOf(c) ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {bivora ? <Badge tone="brand">Bivora</Badge> : <Badge>ARK</Badge>}
                      {isDemo(c) ? <Badge>Demo</Badge> : <Badge tone="up">Real</Badge>}
                      {(c.locked === true || c.isLocked === true) && <Badge tone="down">Locked</Badge>}
                      <svg viewBox="0 0 24 24" className="size-4 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </summary>
                  {bivora && (
                    <p className="border-t border-line/60 bg-surface-2/40 px-4 pt-3 text-xs sm:px-5">
                      Opened in Bivora for{" "}
                      <Link href={`/admin/users/${bivora.id}`} className="font-medium text-brand hover:underline">
                        {bivora.name || "this client"}
                      </Link>
                      {bivora.email && <span className="text-muted"> · {bivora.email}</span>}
                    </p>
                  )}
                  <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-2 bg-surface-2/40 px-4 py-3 text-xs sm:grid-cols-2 sm:px-5 lg:grid-cols-3", !bivora && "border-t border-line/60")}>
                    {Object.entries(c)
                      .filter(([, value]) => value === null || typeof value !== "object")
                      .map(([key, value]) => (
                        <div key={key} className="flex min-w-0 justify-between gap-3">
                          <dt className="shrink-0 text-muted">{label(key)}</dt>
                          <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{detail(key, value)}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PendingArea>
  );
}

function count(section: { data?: { rows: unknown[]; capped: boolean }; error?: string }) {
  if (!section.data) return "—";
  return `${section.data.rows.length.toLocaleString("en-US")}${section.data.capped ? "+" : ""}`;
}

function Badge({ tone, children }: { tone?: "up" | "down" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "up" ? "bg-up/15 text-up" : tone === "down" ? "bg-down/15 text-down" : tone === "brand" ? "bg-brand/15 text-brand" : "bg-line text-muted",
      )}
    >
      {children}
    </span>
  );
}

// ---------- Account details ----------

const ID_KEY = /(^id$|id$|^userid|accountid|parentid)/i;

function label(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return (words[0].toUpperCase() + words.slice(1)).replace(/\bId\b/gi, "ID").replace(/\bP ?L\b/gi, "P/L");
}

/** One value in a client's details: IDs and counts as plain numbers. */
function detail(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return Number.isInteger(value) || ID_KEY.test(key) ? String(value) : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value) ? value.slice(0, 16).replace("T", " ") : value;
  return null;
}

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Button, ButtonLink, Card, CardHeader, EmptyState, Input, PageHeader, StatCard, Table, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { accountIdOf, bivoraAccounts, bivoraClientFor, getArkOverview, isDemo, nameOf, parentIdOf, userIdOf, type ArkRow } from "@/lib/ark/reports";

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
        <PageHeader title="ARK accounts" description="Offices, accounts and their trading financials, straight from ARK." />
        <Alert tone="error">{overview.error}</Alert>
        <p className="mt-3 text-sm">
          <Link href="/admin/settings" className="font-medium text-brand hover:underline">Check ARK settings</Link>
        </p>
      </>
    );
  }

  const { top, node, nodeInfo, offices, clients, financials } = overview;
  const officeRows = offices.data?.rows ?? [];
  const clientRows = clients.data?.rows ?? [];
  const clientsPerOffice = new Map<number, number>();
  for (const c of clientRows) {
    const parent = parentIdOf(c);
    if (parent !== undefined) clientsPerOffice.set(parent, (clientsPerOffice.get(parent) ?? 0) + 1);
  }
  const demo = clientRows.filter(isDemo).length;
  // Opened by approving a client in Bivora, or created directly in ARK.
  const tagged = clientRows.map((row) => ({ row, bivora: bivoraClientFor(row, accounts) }));
  const fromBivora = tagged.filter((t) => t.bivora).length;
  const listed = tagged.filter((t) => source === "all" || (source === "bivora") === Boolean(t.bivora));
  const filterHref = (s: string) => `/admin/ark?${new URLSearchParams({ ...(requested && { node: String(requested) }), ...(s !== "all" && { source: s }) })}`;
  const nodeName = nodeInfo ? nameOf(nodeInfo) : "";

  return (
    <>
      <PageHeader
        title="ARK accounts"
        description="Offices, clients and their trading financials, straight from ARK."
        action={
          <form className="flex w-full gap-2 sm:w-auto">
            <Input name="node" inputMode="numeric" placeholder="Office or node ID" defaultValue={requested} aria-label="Office or node ID" className="sm:w-48" />
            <Button variant="secondary" type="submit">Show</Button>
          </form>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>
          Showing everything under node <span className="font-mono font-medium text-foreground">{node}</span>
          {nodeName && <> · {nodeName}</>}
          {node === top && " (the top node the dealer can see)"}
        </span>
        {node !== top && (
          <Link href="/admin/ark" className="font-medium text-brand hover:underline">Back to the top</Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Offices" value={count(offices)} />
        <StatCard label="Clients" value={count(clients)} />
        <StatCard label="Opened in Bivora" value={clients.data ? fromBivora.toLocaleString("en-US") : "—"} tone="brand" />
        <StatCard label="Opened in ARK" value={clients.data ? (clientRows.length - fromBivora).toLocaleString("en-US") : "—"} />
        <StatCard label="Real accounts" value={clients.data ? (clientRows.length - demo).toLocaleString("en-US") : "—"} tone="up" />
        <StatCard label="Demo accounts" value={clients.data ? demo.toLocaleString("en-US") : "—"} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Offices" description="Use an office ID in ARK settings to choose where new clients are created." />
        {offices.error ? (
          <div className="p-4 sm:p-5"><Alert tone="error">{offices.error}</Alert></div>
        ) : officeRows.length === 0 ? (
          <EmptyState title="No offices under this node." />
        ) : (
          <ul className="divide-y divide-line">
            {officeRows.map((o) => {
              const id = userIdOf(o)!;
              return (
                <li key={id} className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-5", id === node && "bg-brand/5")}>
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <p className="font-medium">{nameOf(o) || "Unnamed office"}</p>
                    <p className="text-xs text-muted">
                      {typeof o.username === "string" && <>{o.username} · </>}
                      Parent {parentIdOf(o) ?? "—"} · {clientsPerOffice.get(id) ?? 0} clients
                      {isDemo(o) && " · Demo"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-sm">
                      <span className="text-xs text-muted">ID </span>{id}
                    </span>
                    {id !== node && (
                      <ButtonLink href={`/admin/ark?node=${id}`} variant="ghost" className="px-2.5">View</ButtonLink>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Trading financial report" description="Financial standing of every real account under this node." />
        {financials.error ? (
          <div className="p-4 sm:p-5"><Alert tone="error">{financials.error}</Alert></div>
        ) : (
          <FinancialTable rows={financials.data ?? []} names={new Map(clientRows.map((c) => [userIdOf(c)!, c]))} />
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Accounts"
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
            <Link
              key={value}
              href={filterHref(value)}
              aria-current={source === value ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm",
                source === value ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {text}
            </Link>
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
    </>
  );
}

function count(section: { data?: { rows: ArkRow[]; capped: boolean }; error?: string }) {
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

// ---------- Financial report ----------

const ID_KEY = /(^id$|id$|^userid|accountid|parentid)/i;
// Adding these up across accounts means nothing.
const NOT_SUMMED = /level|percent|ratio|leverage|date|time/i;
const NAME_KEYS = ["username", "userName", "firstName", "lastName", "name"];

function label(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return (words[0].toUpperCase() + words.slice(1)).replace(/\bId\b/gi, "ID").replace(/\bP ?L\b/gi, "P/L");
}

/** One value in a client's details: IDs and counts as plain numbers. */
function detail(key: string, value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? String(value) : cell(key, value);
}

function cell(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return ID_KEY.test(key) ? String(value) : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value) ? value.slice(0, 16).replace("T", " ") : value;
  return null;
}

function FinancialTable({ rows, names }: { rows: ArkRow[]; names: Map<number, ArkRow> }) {
  if (rows.length === 0) return <EmptyState title="No financial data for this node." />;

  // Columns are whatever ARK sends, identity first. Nested values are skipped.
  const keys: string[] = [];
  for (const row of rows.slice(0, 50)) {
    for (const [key, value] of Object.entries(row)) {
      if (!keys.includes(key) && (value === null || typeof value !== "object")) keys.push(key);
    }
  }
  const idKeys = keys.filter((k) => ID_KEY.test(k));
  const nameKeys = keys.filter((k) => NAME_KEYS.includes(k));
  const rest = keys.filter((k) => !idKeys.includes(k) && !nameKeys.includes(k));
  const columns = [...idKeys, ...nameKeys, ...rest];
  const showClient = nameKeys.length === 0 && rows.some((r) => names.has(userIdOf(r) ?? -1));
  const summed = rest.filter((k) => !NOT_SUMMED.test(k) && rows.some((r) => typeof r[k] === "number"));
  const totals = Object.fromEntries(summed.map((k) => [k, rows.reduce((sum, r) => sum + (typeof r[k] === "number" ? (r[k] as number) : 0), 0)]));

  return (
    <>
      <Table>
        <thead>
          <tr>
            {showClient && <th>Client</th>}
            {columns.map((k) => (
              <th key={k} className={cn("whitespace-nowrap", rest.includes(k) && "text-right")}>{label(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={userIdOf(r) ?? i}>
              {showClient && <td className="whitespace-nowrap">{nameOf(names.get(userIdOf(r) ?? -1) ?? {}) || "—"}</td>}
              {columns.map((k) => {
                const v = r[k];
                return (
                  <td
                    key={k}
                    className={cn(
                      "whitespace-nowrap",
                      rest.includes(k) && "text-right font-mono tabular-nums",
                      typeof v === "number" && v < 0 && !ID_KEY.test(k) && "text-down",
                    )}
                  >
                    {cell(k, v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {summed.length > 0 && rows.length > 1 && (
          <tfoot className="border-t border-line font-medium">
            <tr>
              {showClient && <td>Total</td>}
              {columns.map((k, i) => (
                <td key={k} className={cn("whitespace-nowrap", rest.includes(k) && "text-right font-mono tabular-nums")}>
                  {k in totals ? cell(k, totals[k]) : !showClient && i === 0 ? "Total" : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </Table>
      <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
        {rows.length.toLocaleString("en-US")} accounts. Columns are shown as ARK sends them. Scroll sideways on small screens.
      </p>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PendingArea, PendingForm, PendingLink } from "@/components/pending-nav";
import { Button, Card, CardHeader, EmptyState, Input, PageHeader, Select, buttonClass, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Emails" };

const PAGE = 100;
/** The last 24 hours, for the counts in the page description. */
const lastDay = () => ({ gte: new Date(Date.now() - 86_400_000) });
const param = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export default async function EmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  await requireAdmin();
  const q = await searchParams;
  const to = param(q.to);
  const status = param(q.status) === "FAILED" || param(q.status) === "SENT" ? param(q.status) : "";
  const untilParam = param(q.until);
  const until = untilParam && !Number.isNaN(Date.parse(untilParam)) ? new Date(untilParam) : null;

  const where = {
    ...(to && { to: { contains: to, mode: "insensitive" as const } }),
    ...(status && { status }),
    ...(until && { createdAt: { lt: until } }),
  };
  const [rows, failed24h, sent24h] = await Promise.all([
    db.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE + 1 }),
    db.emailLog.count({ where: { status: "FAILED", createdAt: lastDay() } }),
    db.emailLog.count({ where: { status: "SENT", createdAt: lastDay() } }),
  ]);
  const shown = rows.slice(0, PAGE);
  const older = rows.length > PAGE ? shown[PAGE - 1].createdAt.toISOString() : null;
  // Client names for the addresses on this page, so each email links to its client.
  const clients = await db.user.findMany({
    where: { email: { in: [...new Set(shown.map((r) => r.to.toLowerCase()))] } },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  const byEmail = new Map(clients.map((c) => [c.email.toLowerCase(), c]));
  const keep = { ...(to && { to }), ...(status && { status }) };

  return (
    <PendingArea>
      <PageHeader title="Emails" description={`Every email Bivora sends. Last 24 hours: ${sent24h} sent, ${failed24h} failed.`} />
      <Card className="mb-6">
        <PendingForm action="/admin/emails" className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end sm:p-5">
          <label className="col-span-2 block space-y-1.5 sm:col-span-1">
            <span className="block text-sm font-medium">Recipient</span>
            <Input name="to" type="search" placeholder="Email address…" defaultValue={to} />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">Status</span>
            <Select name="status" defaultValue={status}>
              <option value="">Sent and failed</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </Select>
          </label>
          <Button type="submit" variant="secondary" className="self-end">Apply</Button>
        </PendingForm>
      </Card>

      <Card>
        <CardHeader
          title="Sent emails"
          description="Newest first. Only who, what and when is kept, never the email itself."
          action={until ? <PendingLink href={`/admin/emails?${new URLSearchParams(keep)}`} className={buttonClass("ghost")}>Newest</PendingLink> : undefined}
        />
        {shown.length === 0 ? (
          <EmptyState title={to || status ? "No emails match these filters." : "No emails recorded yet."}>
            Emails are recorded from now on; earlier ones aren&apos;t listed.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((r) => {
              const client = byEmail.get(r.to.toLowerCase());
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
                  <div className="min-w-0 flex-1 basis-60 [overflow-wrap:anywhere]">
                    <p className="font-medium">{r.subject}</p>
                    <p className="mt-0.5 text-muted">
                      {client && client.role === "USER" ? (
                        <Link href={`/admin/users/${client.id}`} className="hover:text-brand">{client.firstName} {client.lastName}</Link>
                      ) : null}
                      <span className="text-xs"> {client && client.role === "USER" ? "· " : ""}{r.to}</span>
                    </p>
                    {r.error && <p className="text-xs text-down">{r.error}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", r.status === "SENT" ? "bg-up/15 text-up" : "bg-down/15 text-down")}>
                      {r.status === "SENT" ? "Sent" : "Failed"}
                    </span>
                    <p className="mt-1 text-xs text-muted">{formatDate(r.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {older && (
          <div className="border-t border-line p-4 text-center sm:p-5">
            <PendingLink href={`/admin/emails?${new URLSearchParams({ ...keep, until: older })}`} className={buttonClass("secondary")}>Load older emails</PendingLink>
          </div>
        )}
      </Card>
    </PendingArea>
  );
}

import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireAdmin();
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <>
      <PageHeader title="Messages" description="Sent through the contact form on the website." />
      <Card>
        {messages.length === 0 ? (
          <EmptyState title="No messages yet." />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {messages.map((m) => (
              <li key={m.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{formatDate(m.createdAt)}</p>
                </div>
                <a href={`mailto:${m.email}`} className="block text-xs font-medium text-brand [overflow-wrap:anywhere] hover:underline">
                  {m.email}
                </a>
                <p className="mt-2 whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { AddAdminButton, AdminAccessButton, ChangeAdminPasswordButton } from "./admin-forms";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const me = await requireAdmin();
  const admins = await db.user.findMany({ where: { role: "SUPER_ADMIN" }, orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Admins"
        description="Everyone here has full access to the admin console."
        action={<AddAdminButton />}
      />
      <Card>
        <ul className="divide-y divide-line text-sm">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1 basis-56">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{a.firstName} {a.lastName}</span>
                  {a.id === me.id && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">You</span>}
                  <StatusBadge status={a.status} />
                </p>
                <p className="truncate text-xs text-muted">{a.email} · Added {formatDate(a.createdAt)}</p>
              </div>
              {a.id === me.id ? (
                <ChangeAdminPasswordButton />
              ) : (
                <AdminAccessButton id={a.id} name={`${a.firstName} ${a.lastName}`} active={a.status === "ACTIVE"} />
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { BankAccounts } from "./bank-accounts";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const bankAccounts = await db.bankAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader title="Profile" description="Your personal details, bank accounts and security settings." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Personal details" />
          <ProfileForm
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone ?? "",
              country: user.country ?? "",
            }}
          />
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" />
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1"><StatusBadge status={user.status} /></dd>
              </div>
              <div>
                <dt className="text-muted">Member since</dt>
                <dd className="mt-1">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted">Base currency</dt>
                <dd className="mt-1">{user.currency}</dd>
              </div>
              <div>
                <dt className="text-muted">Trading account</dt>
                <dd className="mt-1">{user.arkAccountId ?? <span className="text-warning">Pending</span>}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Change password" />
            <PasswordForm />
          </Card>
        </div>
      </div>
      <div className="mt-6">
        <BankAccounts accounts={bankAccounts} />
      </div>
    </>
  );
}

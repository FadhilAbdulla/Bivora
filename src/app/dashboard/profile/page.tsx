import type { Metadata } from "next";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { Button, ButtonLink, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { BankAccounts } from "./bank-accounts";
import { ChangePasswordButton, EditProfileButton } from "./forms";

export const metadata: Metadata = { title: "Profile" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm sm:px-5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const bankAccounts = await db.bankAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const missing = <span className="font-normal text-muted">Not added</span>;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details, bank accounts and security."
        action={
          <form action={logout}>
            <Button variant="secondary">Log out</Button>
          </form>
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Personal details"
            action={
              <EditProfileButton
                user={{
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  phone: user.phone ?? "",
                  country: user.country ?? "",
                }}
              />
            }
          />
          <dl className="divide-y divide-line">
            <Row label="Name">
              {user.firstName} {user.lastName}
            </Row>
            <Row label="Email">{user.email}</Row>
            <Row label="Phone">{user.phone ?? missing}</Row>
            <Row label="Country">{user.country ?? missing}</Row>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Account" />
          <dl className="divide-y divide-line">
            <Row label="Verification">
              <StatusBadge status={user.kycStatus} />
            </Row>
            <Row label="Member since">{formatDate(user.createdAt)}</Row>
            <Row label="Base currency">{user.currency}</Row>
            <Row label="Trading username">{(user.arkUserId && user.arkUsername) || <span className="text-warning">Pending</span>}</Row>
          </dl>
        </Card>
      </div>
      <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
        <BankAccounts accounts={bankAccounts} />
        <Card>
          {user.passwordHash ? (
            <CardHeader
              title="Password"
              description="Choose a strong password you don't use anywhere else."
              action={<ChangePasswordButton />}
            />
          ) : (
            <CardHeader
              title="Password"
              description="You signed up with Google and haven't set a password. You can add one to log in with your email too."
              action={
                <ButtonLink href="/forgot-password" variant="secondary">
                  Set password
                </ButtonLink>
              }
            />
          )}
        </Card>
      </div>
    </>
  );
}

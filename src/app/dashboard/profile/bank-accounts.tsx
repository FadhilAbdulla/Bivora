import type { BankAccount } from "@prisma/client";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { MAX_BANK_ACCOUNTS, maskAccountNumber } from "@/lib/bank";
import { AddBankAccountButton, BankAccountActions } from "./bank-account-form";

export function BankAccounts({ accounts }: { accounts: BankAccount[] }) {
  return (
    <Card id="bank-accounts" className="scroll-mt-24">
      <CardHeader
        title="Bank accounts"
        description="Where your withdrawals are paid."
        action={<AddBankAccountButton disabled={accounts.length >= MAX_BANK_ACCOUNTS} />}
      />
      {accounts.length === 0 ? (
        <EmptyState title="No bank accounts yet">Add one to withdraw by bank transfer.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z" />
                  </svg>
                </span>
                <div className="min-w-0 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{a.bankName}</span>
                    {a.isDefault && <span className="rounded-full bg-up/15 px-2 py-0.5 text-[11px] font-medium text-up">Default</span>}
                  </p>
                  <p className="truncate text-muted">
                    {maskAccountNumber(a.accountNumber)} · {a.currency} · {a.accountHolder}
                  </p>
                </div>
              </div>
              <BankAccountActions id={a.id} name={`${a.bankName} ${maskAccountNumber(a.accountNumber)}`} isDefault={a.isDefault} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

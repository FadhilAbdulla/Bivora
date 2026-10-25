import type { BankAccount } from "@prisma/client";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { MAX_BANK_ACCOUNTS, maskAccountNumber } from "@/lib/bank";
import { deleteBankAccount, setDefaultBankAccount } from "../actions";
import { BankAccountForm } from "./bank-account-form";

export function BankAccounts({ accounts }: { accounts: BankAccount[] }) {
  return (
    <Card id="bank-accounts" className="scroll-mt-24">
      <CardHeader
        title="Bank accounts"
        description={`Saved accounts for withdrawals. You can save up to ${MAX_BANK_ACCOUNTS}.`}
      />
      <div className="grid lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 border-line lg:border-r">
          {accounts.length === 0 ? (
            <EmptyState title="No bank accounts yet.">Add one to withdraw by bank transfer.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z" />
                      </svg>
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        {a.bankName}
                        {a.isDefault && (
                          <span className="rounded-full bg-up/15 px-2 py-0.5 text-[11px] font-medium text-up">Default</span>
                        )}
                      </p>
                      <p className="text-muted">
                        {a.accountHolder} · {maskAccountNumber(a.accountNumber)} · {a.currency}
                      </p>
                      {(a.iban || a.swiftCode) && (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted">
                          {[a.iban && `IBAN ${a.iban}`, a.swiftCode && `SWIFT ${a.swiftCode}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {!a.isDefault && (
                      <form action={setDefaultBankAccount}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-muted hover:text-foreground">Make default</button>
                      </form>
                    )}
                    <form action={deleteBankAccount}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-muted hover:text-danger">Remove</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-line lg:border-t-0">
          {accounts.length < MAX_BANK_ACCOUNTS ? (
            <BankAccountForm />
          ) : (
            <p className="p-5 text-sm text-muted">Remove an account to add a new one.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

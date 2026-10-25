import type { BankAccount } from "@prisma/client";

export const MAX_BANK_ACCOUNTS = 5;

type BankFields = Pick<BankAccount, "bankName" | "accountHolder" | "accountNumber" | "iban" | "swiftCode" | "branch" | "country">;

/** Payout details text stored on a withdrawal request. */
export function formatBankAccount(a: BankFields) {
  return [
    a.bankName,
    a.accountHolder,
    a.iban ? `IBAN ${a.iban}` : `Acc ${a.accountNumber}`,
    a.iban && `Acc ${a.accountNumber}`,
    a.swiftCode && `SWIFT ${a.swiftCode}`,
    a.branch,
    a.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function maskAccountNumber(n: string) {
  return n.length <= 4 ? n : `•••• ${n.slice(-4)}`;
}

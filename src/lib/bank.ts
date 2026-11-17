import type { BankAccount } from "@prisma/client";

export const MAX_BANK_ACCOUNTS = 5;

/** India's bank branch code: 4 letters, a 0, then 6 letters or digits (e.g. SBIN0070257). */
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** SWIFT / BIC: bank (4 letters), country (2 letters), location (2), optional branch (3). */
export const SWIFT = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/** "IFSC" or "SWIFT", for showing a saved code with the right name. */
export const bankCodeName = (code: string) => (IFSC.test(code) ? "IFSC" : "SWIFT");

type BankFields = Pick<BankAccount, "bankName" | "accountHolder" | "accountNumber" | "iban" | "swiftCode" | "branch" | "country">;

/** Payout details text stored on a withdrawal request. */
export function formatBankAccount(a: BankFields) {
  return [
    a.bankName,
    a.accountHolder,
    a.iban ? `IBAN ${a.iban}` : `Acc ${a.accountNumber}`,
    a.iban && `Acc ${a.accountNumber}`,
    a.swiftCode && `${bankCodeName(a.swiftCode)} ${a.swiftCode}`,
    a.branch,
    a.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function maskAccountNumber(n: string) {
  return n.length <= 4 ? n : `•••• ${n.slice(-4)}`;
}

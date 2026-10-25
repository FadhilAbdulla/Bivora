export const MIN_DEPOSIT = 50;
export const MIN_WITHDRAWAL = 20;
export const MAX_REQUEST_AMOUNT = 1_000_000;

export const DEPOSIT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "USDT_TRC20", label: "USDT (TRC20)" },
  { value: "USDT_ERC20", label: "USDT (ERC20)" },
  { value: "CARD", label: "Credit / debit card" },
] as const;

export const WITHDRAWAL_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "USDT_TRC20", label: "USDT (TRC20)" },
  { value: "USDT_ERC20", label: "USDT (ERC20)" },
] as const;

export const METHOD_LABELS: Record<string, string> = Object.fromEntries(
  [...DEPOSIT_METHODS, ...WITHDRAWAL_METHODS].map((m) => [m.value, m.label]),
);

// Shown on the deposit page. Replace with your real payment details.
export const PAYMENT_INSTRUCTIONS: Record<string, string[]> = {
  BANK_TRANSFER: [
    "Bank: [Your bank name]",
    "Account name: [Your company name]",
    "IBAN / Account no.: [Account number]",
    "SWIFT: [SWIFT code]",
    "Use your registered email as the payment reference.",
  ],
  USDT_TRC20: ["Network: TRON (TRC20)", "Address: [Your TRC20 wallet address]", "Paste the transaction hash below."],
  USDT_ERC20: ["Network: Ethereum (ERC20)", "Address: [Your ERC20 wallet address]", "Paste the transaction hash below."],
  CARD: ["Our team will send you a secure card payment link after you submit this request."],
};

export const MIN_DEPOSIT = 50;
/** No minimum: any amount above zero, up to what's available. */
export const MIN_WITHDRAWAL = 0.01;
export const MAX_REQUEST_AMOUNT = 1_000_000;

// Only bank transfer is offered for now. Add a method back here to offer it again.
export const DEPOSIT_METHODS = [{ value: "BANK_TRANSFER", label: "Bank transfer" }] as const;
export const WITHDRAWAL_METHODS = [{ value: "BANK_TRANSFER", label: "Bank transfer" }] as const;

/** Labels for every method, including ones no longer offered, so older requests still read well. */
export const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  USDT_TRC20: "USDT (TRC20)",
  USDT_ERC20: "USDT (ERC20)",
  CARD: "Credit / debit card",
};

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

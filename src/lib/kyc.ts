// Identity documents collected after registration. Safe to import from client components.

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PDF_TYPE = "application/pdf";

export type KycSlotDef = { slot: string; label: string; required: boolean; imagesOnly?: boolean };
export type KycDocDef = { type: string; step: string; title: string; hint: string; slots: KycSlotDef[] };

// Each document is its own onboarding step. A PDF in the FRONT slot covers both sides.
export const KYC_DOCS: KycDocDef[] = [
  {
    type: "PASSPORT",
    step: "passport",
    title: "Passport",
    hint: "Add the front and back of your passport. If you have one PDF with both, upload it under Front.",
    slots: [
      { slot: "FRONT", label: "Front", required: true },
      { slot: "BACK", label: "Back", required: true, imagesOnly: true },
    ],
  },
  {
    type: "EMIRATES_ID",
    step: "emirates-id",
    title: "Emirates ID",
    hint: "Add both sides of your card. If you have one PDF with both sides, upload it under Front.",
    slots: [
      { slot: "FRONT", label: "Front", required: true },
      { slot: "BACK", label: "Back", required: true, imagesOnly: true },
    ],
  },
  {
    type: "PROOF_OF_ADDRESS",
    step: "proof-of-address",
    title: "Proof of address",
    hint: "A recent utility bill or bank statement showing your name and address.",
    slots: [{ slot: "MAIN", label: "Proof of address", required: true }],
  },
];

export type KycDocumentInfo = { id: string; type: string; slot: string; fileName: string; mimeType: string; size: number };

export function findSlot(type: string, slot: string) {
  return KYC_DOCS.find((d) => d.type === type)?.slots.find((s) => s.slot === slot);
}

type DocRef = Pick<KycDocumentInfo, "type" | "slot" | "mimeType">;

export function isDocComplete(def: KycDocDef, docs: DocRef[]) {
  const mine = docs.filter((d) => d.type === def.type);
  const frontIsPdf = mine.some((d) => d.slot === "FRONT" && d.mimeType === PDF_TYPE);
  return def.slots.every(
    (s) => !s.required || (s.slot === "BACK" && frontIsPdf) || mine.some((d) => d.slot === s.slot),
  );
}

export function isKycComplete(docs: DocRef[]) {
  return KYC_DOCS.every((def) => isDocComplete(def, docs));
}

/** Documents can only change before submission, or after a rejection. */
export function canEditKyc(status: string) {
  return status === "NOT_SUBMITTED" || status === "REJECTED";
}

/** Clients can look around while under review, but money only moves once their documents are approved. */
export function isKycApproved(status: string) {
  return status === "APPROVED";
}

/** Submitted and waiting on a super admin. APPROVING means the ARK account is being created right now. */
export function isKycInReview(status: string) {
  return status === "PENDING" || status === "APPROVING";
}

/** Where a client has got to, as shown to super admins. */
export function kycStage(status: string, docs: DocRef[]) {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "APPROVING") return "Approving";
  if (status === "PENDING") return "Ready to approve";
  const next = KYC_DOCS.find((def) => !isDocComplete(def, docs));
  return next ? `Needs ${next.title.toLowerCase().replace("emirates id", "Emirates ID")}` : "Needs terms";
}

export function kycTitle(type: string) {
  return KYC_DOCS.find((d) => d.type === type)?.title ?? type;
}

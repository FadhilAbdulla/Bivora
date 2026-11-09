"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KYC_DOCS, isDocComplete, type KycDocumentInfo } from "@/lib/kyc";
import { DocumentSlots } from "@/app/onboarding/documents-form";

/** An admin adds or replaces a client's documents (until the client is approved). */
export function AdminDocuments({ userId, initialDocuments }: { userId: string; initialDocuments: KycDocumentInfo[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const update = (change: (all: KycDocumentInfo[]) => KycDocumentInfo[]) => {
    setDocuments(change);
    // The checklist and stage above come from the server.
    router.refresh();
  };
  return (
    <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-3">
      {KYC_DOCS.map((def) => (
        <div key={def.type} className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium">
            {def.title}
            {isDocComplete(def, documents) && <span className="text-xs text-up">✓ Done</span>}
          </p>
          <p className="mb-3 mt-0.5 text-xs text-muted">{def.hint}</p>
          <DocumentSlots def={def} documents={documents} onChange={update} api={`/api/admin/clients/${encodeURIComponent(userId)}/kyc`} />
        </div>
      ))}
    </div>
  );
}

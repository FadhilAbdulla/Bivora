import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { requireDocumentsUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { KYC_DOCS, canEditKyc, isDocComplete } from "@/lib/kyc";
import { DocumentStep } from "../documents-form";

export default async function DocumentStepPage({ params }: PageProps<"/onboarding/[step]">) {
  // Checked first, so a client who has already submitted always lands in the dashboard, even from an old link.
  const user = await requireDocumentsUser();
  if (!canEditKyc(user.kycStatus)) redirect("/dashboard");

  const { step } = await params;
  const index = KYC_DOCS.findIndex((d) => d.step === step);
  if (index === -1) notFound();
  const def = KYC_DOCS[index];

  const documents = await db.kycDocument.findMany({
    where: { userId: user.id },
    select: { id: true, type: true, slot: true, fileName: true, mimeType: true, size: true },
  });
  // Steps must be done in order.
  if (KYC_DOCS.slice(0, index).some((d) => !isDocComplete(d, documents))) redirect("/onboarding");

  return (
    <div className="step-in">
      <h1 className="text-2xl font-semibold tracking-tight">{def.title}</h1>
      <p className="mt-1 text-sm text-muted">{def.hint}</p>
      {user.kycStatus === "REJECTED" && (
        <div className="mt-4">
          <Alert tone="error">
            We couldn&apos;t verify your documents{user.kycNote ? `: ${user.kycNote}` : "."} Please replace them and submit again.
          </Alert>
        </div>
      )}
      <DocumentStep
        key={def.type}
        type={def.type}
        initialDocuments={documents.filter((d) => d.type === def.type)}
        backHref={index > 0 ? `/onboarding/${KYC_DOCS[index - 1].step}` : undefined}
        nextHref={KYC_DOCS[index + 1] ? `/onboarding/${KYC_DOCS[index + 1].step}` : "/onboarding/terms"}
      />
    </div>
  );
}

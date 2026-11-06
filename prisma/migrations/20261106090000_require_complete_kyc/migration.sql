-- Both sides of the passport and Emirates ID are now required (a PDF under FRONT covers both).
-- Accounts submitted without them go back to onboarding, which also removes their dashboard access.
UPDATE "User"
SET "kycStatus" = 'NOT_SUBMITTED', "kycNote" = NULL, "kycSubmittedAt" = NULL, "kycReviewedAt" = NULL
WHERE "role" = 'USER'
  AND "kycStatus" IN ('PENDING', 'APPROVED')
  AND (
    "id" NOT IN (
      SELECT f."userId" FROM "KycDocument" f
      WHERE f."type" = 'PASSPORT' AND f."slot" = 'FRONT' AND (
        f."mimeType" = 'application/pdf' OR EXISTS (
          SELECT 1 FROM "KycDocument" b WHERE b."userId" = f."userId" AND b."type" = f."type" AND b."slot" = 'BACK'
        )
      )
    )
    OR "id" NOT IN (
      SELECT f."userId" FROM "KycDocument" f
      WHERE f."type" = 'EMIRATES_ID' AND f."slot" = 'FRONT' AND (
        f."mimeType" = 'application/pdf' OR EXISTS (
          SELECT 1 FROM "KycDocument" b WHERE b."userId" = f."userId" AND b."type" = f."type" AND b."slot" = 'BACK'
        )
      )
    )
    OR "id" NOT IN (SELECT "userId" FROM "KycDocument" WHERE "type" = 'PROOF_OF_ADDRESS' AND "slot" = 'MAIN')
  );

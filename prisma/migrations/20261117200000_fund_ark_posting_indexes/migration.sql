-- ARK's transaction number for an approved deposit or withdrawal.
ALTER TABLE "FundRequest" ADD COLUMN     "arkTrxId" TEXT;

-- CreateIndex
CREATE INDEX "User_arkUserId_idx" ON "User"("arkUserId");

-- CreateIndex
CREATE INDEX "User_arkUsername_idx" ON "User"("arkUsername");

-- CreateIndex
CREATE INDEX "ArkMoneyTransaction_status_createdAt_idx" ON "ArkMoneyTransaction"("status", "createdAt");

-- Cleanup: stored ARK replies nothing reads any more (client pages fetch ARK live now).
DELETE FROM "ArkCache" WHERE "key" LIKE 'clientAccount:%' OR "key" LIKE 'clientFinancials:%' OR "key" LIKE 'symbols:%';

-- Money posted to clients' ARK accounts from the admin console.
CREATE TABLE "ArkMoneyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arkUserId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "arkTrxId" TEXT,
    "adminId" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "attemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArkMoneyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArkMoneyTransaction_createdAt_idx" ON "ArkMoneyTransaction"("createdAt");
CREATE INDEX "ArkMoneyTransaction_userId_createdAt_idx" ON "ArkMoneyTransaction"("userId", "createdAt");

ALTER TABLE "ArkMoneyTransaction" ADD CONSTRAINT "ArkMoneyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArkMoneyTransaction" ADD CONSTRAINT "ArkMoneyTransaction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

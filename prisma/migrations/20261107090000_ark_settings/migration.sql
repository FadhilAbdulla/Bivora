-- CreateTable
CREATE TABLE "ArkSettings" (
    "id" TEXT NOT NULL DEFAULT 'ark',
    "apiUrl" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "dealerUsername" TEXT NOT NULL,
    "dealerPasswordEnc" TEXT NOT NULL,
    "parentId" INTEGER NOT NULL,
    "genericPolicyId" INTEGER NOT NULL,
    "currenciesPolicyId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "tradingUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArkSettingsChange" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArkSettingsChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArkSettingsChange_createdAt_idx" ON "ArkSettingsChange"("createdAt");


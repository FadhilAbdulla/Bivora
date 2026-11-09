-- A copy of ARK money transactions on Bivora clients' accounts.
CREATE TABLE "ArkTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arkUserId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,
    "reference" TEXT,
    "madeInBivora" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArkTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArkTransaction_userId_time_idx" ON "ArkTransaction"("userId", "time");

ALTER TABLE "ArkTransaction" ADD CONSTRAINT "ArkTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The last good ARK reply per admin view (stale-while-refresh cache).
CREATE TABLE "ArkCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "refreshingAt" TIMESTAMP(3),

    CONSTRAINT "ArkCache_pkey" PRIMARY KEY ("key")
);

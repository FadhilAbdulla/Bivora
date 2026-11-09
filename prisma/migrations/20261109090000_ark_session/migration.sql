-- Shared ARK dealer session, so Bivora logs in once and keeps the session alive with ARK's heartbeat.
ALTER TABLE "ArkSettings" ADD COLUMN "sessionTokenEnc" TEXT;
ALTER TABLE "ArkSettings" ADD COLUMN "sessionUsedAt" TIMESTAMP(3);
ALTER TABLE "ArkSettings" ADD COLUMN "sessionLoginAt" TIMESTAMP(3);

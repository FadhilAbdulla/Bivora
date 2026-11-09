-- An admin-chosen password kept (encrypted) until the client's ARK account is created.
ALTER TABLE "User" ADD COLUMN "arkPasswordEnc" TEXT;

-- Whether the client's ARK account is a demo account.
ALTER TABLE "User" ADD COLUMN "arkIsDemo" BOOLEAN NOT NULL DEFAULT false;

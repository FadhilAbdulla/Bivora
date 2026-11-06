-- Limits how often a password reset email can be sent to one account.
ALTER TABLE "User" ADD COLUMN     "passwordResetSentAt" TIMESTAMP(3);

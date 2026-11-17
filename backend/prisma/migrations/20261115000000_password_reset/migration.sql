-- Password reset: store only a SHA-256 hash of the single-use token and its expiry.

ALTER TABLE "User"
  ADD COLUMN "passwordResetTokenHash" TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

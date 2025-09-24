-- AlterEnum: add new actions for authentication events
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'login_attempt';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'login_failed';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'lockout';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'unlock';

-- AlterTable: extend User with lockout fields
ALTER TABLE "User"
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockReason" TEXT;

-- Indexes to improve rate limiting and audit queries
CREATE INDEX IF NOT EXISTS "ActivityLog_ip_idx" ON "ActivityLog"("ip");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");

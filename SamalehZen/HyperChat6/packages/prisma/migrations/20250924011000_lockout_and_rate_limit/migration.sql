-- AlterEnum: add new actions for authentication events
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'login_attempt';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'login_failed';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'lockout';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'unlock';

-- AlterTable: extend User with lockout fields
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockReason" TEXT;

-- Indexes to improve rate limiting and audit queries
CREATE INDEX IF NOT EXISTS "ActivityLog_ip_idx" ON "ActivityLog"("ip");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");

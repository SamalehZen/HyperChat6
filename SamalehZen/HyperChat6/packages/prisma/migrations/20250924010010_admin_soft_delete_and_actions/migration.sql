-- Add enum values for ActivityAction
DO $$ BEGIN
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'login_failed';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'lockout';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'unlock';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add soft-delete and lock fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Optional index to speed up filtering by deletion
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User" ("deletedAt");

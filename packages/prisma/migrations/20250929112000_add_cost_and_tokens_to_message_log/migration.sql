-- Add cost and token columns to MessageLog
ALTER TABLE "MessageLog"
  ADD COLUMN IF NOT EXISTS "promptTokens" INTEGER,
  ADD COLUMN IF NOT EXISTS "completionTokens" INTEGER,
  ADD COLUMN IF NOT EXISTS "costUsdCents" INTEGER NOT NULL DEFAULT 0;

-- Helpful composite index if needed for cost charts (mode + createdAt)
CREATE INDEX IF NOT EXISTS "MessageLog_mode_createdAt_idx" ON "MessageLog"("mode", "createdAt");

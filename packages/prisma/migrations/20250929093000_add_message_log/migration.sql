-- Create MessageLog table to track AI requests
CREATE TABLE IF NOT EXISTS "MessageLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT,
  "mode" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "creditCost" INTEGER NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to optimize common queries (time range + group by)
CREATE INDEX IF NOT EXISTS "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");
CREATE INDEX IF NOT EXISTS "MessageLog_mode_idx" ON "MessageLog"("mode");
CREATE INDEX IF NOT EXISTS "MessageLog_provider_idx" ON "MessageLog"("provider");
CREATE INDEX IF NOT EXISTS "MessageLog_userId_idx" ON "MessageLog"("userId");
CREATE INDEX IF NOT EXISTS "MessageLog_status_idx" ON "MessageLog"("status");

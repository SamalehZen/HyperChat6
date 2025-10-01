-- CreateTable
CREATE TABLE IF NOT EXISTS "TelemetryTTFB" (
  "id" TEXT PRIMARY KEY,
  "correlationId" TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  "mode" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "region" TEXT,
  "t0" TIMESTAMP,
  "t1" TIMESTAMP,
  "t2" TIMESTAMP,
  "t3" TIMESTAMP,
  "t4" TIMESTAMP,
  "t5" TIMESTAMP,
  "t6" TIMESTAMP,
  "preProcessingMs" INTEGER,
  "modelTTFBMs" INTEGER,
  "serverTTFBMs" INTEGER,
  "totalMs" INTEGER,
  "clientInfo" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "TelemetryTTFB_createdAt_idx" ON "TelemetryTTFB" ("createdAt");
CREATE INDEX IF NOT EXISTS "TelemetryTTFB_mode_idx" ON "TelemetryTTFB" ("mode");
CREATE INDEX IF NOT EXISTS "TelemetryTTFB_provider_idx" ON "TelemetryTTFB" ("provider");
CREATE INDEX IF NOT EXISTS "TelemetryTTFB_userId_idx" ON "TelemetryTTFB" ("userId");
-- Add allowedChatModes JSONB column to User to manage per-user chat mode access (null = all allowed)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "allowedChatModes" JSONB;
-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Add learning models for GenMail AI

-- Create enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatternType') THEN
    CREATE TYPE "PatternType" AS ENUM ('SUBJECT_LINE', 'COPY_FRAMEWORK', 'EMAIL_LENGTH', 'SEND_TIME', 'HOOK_TYPE', 'CTA_TYPE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LearningEventType') THEN
    CREATE TYPE "LearningEventType" AS ENUM ('EMAIL_SENT', 'OPENED', 'CLICKED', 'REPLIED', 'CONVERTED', 'REJECTED_BY_HUMAN');
  END IF;
END $$;

-- Create PerformancePattern table
CREATE TABLE "PerformancePattern" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" TEXT NOT NULL,
    "patternType" "PatternType" NOT NULL,
    "patternValue" TEXT NOT NULL,
    sector TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformancePattern_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PerformancePattern_businessId_patternType_patternValue_key" ON "PerformancePattern"("businessId", "patternType", "patternValue");
CREATE INDEX "PerformancePattern_businessId_idx" ON "PerformancePattern"("businessId");
CREATE INDEX "PerformancePattern_businessId_patternType_idx" ON "PerformancePattern"("businessId", "patternType");

-- Create LearningEvent table
CREATE TABLE "LearningEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" TEXT NOT NULL,
    "generatedEmailId" TEXT,
    "eventType" "LearningEventType" NOT NULL,
    signals JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE,
    CONSTRAINT "LearningEvent_generatedEmailId_fkey" FOREIGN KEY ("generatedEmailId") REFERENCES "GeneratedEmail"(id) ON DELETE SET NULL
);

CREATE INDEX "LearningEvent_businessId_idx" ON "LearningEvent"("businessId");
CREATE INDEX "LearningEvent_businessId_eventType_idx" ON "LearningEvent"("businessId", "eventType");
CREATE INDEX "LearningEvent_generatedEmailId_idx" ON "LearningEvent"("generatedEmailId");
CREATE INDEX "LearningEvent_createdAt_idx" ON "LearningEvent"("createdAt");

-- Create Notification table
CREATE TABLE "Notification" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"(id) ON DELETE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX "Notification_businessId_read_idx" ON "Notification"("businessId", read);
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Add new columns to LeadMemory table
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "bestSendTime" TEXT;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "bestFramework" TEXT;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "bestHookType" TEXT;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "avgResponseDelay" DOUBLE PRECISION;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "totalEmailsReceived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "totalOpened" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "totalClicked" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "totalReplied" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "personalOpenRate" DOUBLE PRECISION;
ALTER TABLE "LeadMemory" ADD COLUMN IF NOT EXISTS "personalClickRate" DOUBLE PRECISION;

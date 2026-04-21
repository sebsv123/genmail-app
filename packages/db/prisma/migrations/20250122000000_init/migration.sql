-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'NURTURING', 'QUALIFIED', 'CONVERTED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "SequenceMode" AS ENUM ('EVERGREEN', 'NURTURING_INFINITE');

-- CreateEnum
CREATE TYPE "SequenceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GeneratedEmailStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('RSS', 'URL', 'DOCUMENT', 'SAMPLE_EMAIL');

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('SENT', 'OPENED', 'CLICKED', 'REPLIED', 'UNSUBSCRIBED', 'BOUNCED');

-- CreateTable Business
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "brandVoice" TEXT,
    "prohibitedClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Lead
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "contextData" JSONB,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "intentScore" DOUBLE PRECISION,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable Sequence
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "SequenceMode" NOT NULL,
    "status" "SequenceStatus" NOT NULL DEFAULT 'DRAFT',
    "goal" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable SequenceEnrollment
CREATE TABLE "SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "leadId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailTemplate
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "copyFramework" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable GeneratedEmail
CREATE TABLE "GeneratedEmail" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "GeneratedEmailStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityScore" DOUBLE PRECISION,
    "qualityRationale" TEXT,
    "usedSources" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "leadId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "GeneratedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable LeadMemory
CREATE TABLE "LeadMemory" (
    "id" TEXT NOT NULL,
    "topicsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hooksUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctasUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimsMade" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastEngagement" TIMESTAMP(3),
    "leadId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable KnowledgeSource
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "type" "KnowledgeSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "embedding" vector(1536),
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING',
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable AnalyticsEvent
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "generatedEmailId" TEXT,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Business
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE INDEX "Business_slug_idx" ON "Business"("slug");

-- CreateIndex User
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex Lead
CREATE INDEX "Lead_businessId_stage_idx" ON "Lead"("businessId", "stage");
CREATE INDEX "Lead_businessId_idx" ON "Lead"("businessId");
CREATE UNIQUE INDEX "Lead_businessId_email_key" ON "Lead"("businessId", "email");

-- CreateIndex Sequence
CREATE INDEX "Sequence_businessId_status_idx" ON "Sequence"("businessId", "status");
CREATE INDEX "Sequence_businessId_idx" ON "Sequence"("businessId");

-- CreateIndex SequenceEnrollment
CREATE INDEX "SequenceEnrollment_leadId_idx" ON "SequenceEnrollment"("leadId");
CREATE INDEX "SequenceEnrollment_sequenceId_idx" ON "SequenceEnrollment"("sequenceId");
CREATE UNIQUE INDEX "SequenceEnrollment_leadId_sequenceId_key" ON "SequenceEnrollment"("leadId", "sequenceId");

-- CreateIndex EmailTemplate
CREATE INDEX "EmailTemplate_sequenceId_stepNumber_idx" ON "EmailTemplate"("sequenceId", "stepNumber");
CREATE INDEX "EmailTemplate_sequenceId_idx" ON "EmailTemplate"("sequenceId");

-- CreateIndex GeneratedEmail
CREATE INDEX "GeneratedEmail_leadId_status_idx" ON "GeneratedEmail"("leadId", "status");
CREATE INDEX "GeneratedEmail_leadId_idx" ON "GeneratedEmail"("leadId");
CREATE INDEX "GeneratedEmail_enrollmentId_idx" ON "GeneratedEmail"("enrollmentId");
CREATE INDEX "GeneratedEmail_templateId_idx" ON "GeneratedEmail"("templateId");

-- CreateIndex LeadMemory
CREATE UNIQUE INDEX "LeadMemory_leadId_key" ON "LeadMemory"("leadId");
CREATE INDEX "LeadMemory_leadId_idx" ON "LeadMemory"("leadId");

-- CreateIndex KnowledgeSource
CREATE INDEX "KnowledgeSource_businessId_status_idx" ON "KnowledgeSource"("businessId", "status");
CREATE INDEX "KnowledgeSource_businessId_idx" ON "KnowledgeSource"("businessId");

-- CreateIndex AnalyticsEvent
CREATE INDEX "AnalyticsEvent_leadId_type_idx" ON "AnalyticsEvent"("leadId", "type");
CREATE INDEX "AnalyticsEvent_leadId_idx" ON "AnalyticsEvent"("leadId");
CREATE INDEX "AnalyticsEvent_generatedEmailId_idx" ON "AnalyticsEvent"("generatedEmailId");
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- AddForeignKey User
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Lead
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Sequence
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey SequenceEnrollment
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey EmailTemplate
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey GeneratedEmail
ALTER TABLE "GeneratedEmail" ADD CONSTRAINT "GeneratedEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedEmail" ADD CONSTRAINT "GeneratedEmail_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedEmail" ADD CONSTRAINT "GeneratedEmail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey LeadMemory
ALTER TABLE "LeadMemory" ADD CONSTRAINT "LeadMemory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey KnowledgeSource
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey AnalyticsEvent
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_generatedEmailId_fkey" FOREIGN KEY ("generatedEmailId") REFERENCES "GeneratedEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

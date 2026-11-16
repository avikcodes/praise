-- Migration: 20261115_email_campaign_scheduling_followups
-- Add sequence steps, scheduling, timezone, follow-up automation, and idempotency logs

-- 1. Alter email_campaigns with scheduling & sequence columns
ALTER TABLE "email_campaigns"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "isSequence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "totalSteps" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurringInterval" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "recurringNextAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "email_campaigns_status_scheduledAt_idx" ON "email_campaigns"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "email_campaigns_status_nextRunAt_idx" ON "email_campaigns"("status", "nextRunAt");

-- 2. Alter invitation_recipients with step tracking
ALTER TABLE "invitation_recipients"
  ADD COLUMN IF NOT EXISTS "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastStepSentAt" TIMESTAMP(3);

-- 3. Create email_campaign_steps table
CREATE TABLE IF NOT EXISTS "email_campaign_steps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaign_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_campaign_steps_campaignId_stepNumber_key" ON "email_campaign_steps"("campaignId", "stepNumber");
CREATE INDEX IF NOT EXISTS "email_campaign_steps_campaignId_idx" ON "email_campaign_steps"("campaignId");

ALTER TABLE "email_campaign_steps" ADD CONSTRAINT "email_campaign_steps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_campaign_steps" ADD CONSTRAINT "email_campaign_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "invitation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create campaign_recipient_logs table (Idempotency and recipient step history)
CREATE TABLE IF NOT EXISTS "campaign_recipient_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "recipientId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "campaign_recipient_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipient_logs_idempotencyKey_key" ON "campaign_recipient_logs"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipient_logs_recipientId_stepNumber_key" ON "campaign_recipient_logs"("recipientId", "stepNumber");
CREATE INDEX IF NOT EXISTS "campaign_recipient_logs_campaignId_idx" ON "campaign_recipient_logs"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_recipient_logs_stepId_idx" ON "campaign_recipient_logs"("stepId");
CREATE INDEX IF NOT EXISTS "campaign_recipient_logs_recipientId_idx" ON "campaign_recipient_logs"("recipientId");

ALTER TABLE "campaign_recipient_logs" ADD CONSTRAINT "campaign_recipient_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_recipient_logs" ADD CONSTRAINT "campaign_recipient_logs_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "email_campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_recipient_logs" ADD CONSTRAINT "campaign_recipient_logs_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "invitation_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Create email_campaign_activities table (Campaign audit & history)
CREATE TABLE IF NOT EXISTS "email_campaign_activities" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "stepNumber" INTEGER,
    "details" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_campaign_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_campaign_activities_campaignId_idx" ON "email_campaign_activities"("campaignId");
CREATE INDEX IF NOT EXISTS "email_campaign_activities_workspaceId_idx" ON "email_campaign_activities"("workspaceId");

ALTER TABLE "email_campaign_activities" ADD CONSTRAINT "email_campaign_activities_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_campaign_activities" ADD CONSTRAINT "email_campaign_activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

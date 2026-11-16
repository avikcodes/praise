-- Migration: 20261115_sms_invitations
-- Adds SMS invitations, configurable SMS provider adapters, recipient tracking, and opt-out suppression

-- 1. Alter customers with optional phoneNumber
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- 2. SMS Templates Table
CREATE TABLE IF NOT EXISTS "sms_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "messageBody" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sms_templates_workspaceId_idx" ON "sms_templates"("workspaceId");
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. SMS Campaigns Table
CREATE TABLE IF NOT EXISTS "sms_campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "formId" TEXT NOT NULL,
    "templateId" TEXT,
    "messageBody" TEXT NOT NULL,
    "senderId" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "submittedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "optedOutCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sms_campaigns_workspaceId_idx" ON "sms_campaigns"("workspaceId");
CREATE INDEX IF NOT EXISTS "sms_campaigns_workspaceId_status_idx" ON "sms_campaigns"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "sms_campaigns_formId_idx" ON "sms_campaigns"("formId");

ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_formId_fkey" FOREIGN KEY ("formId") REFERENCES "collection_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "sms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. SMS Recipients Table
CREATE TABLE IF NOT EXISTS "sms_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customFieldsJson" TEXT,
    "messageBody" TEXT,
    "segmentCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "testimonialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_recipients_token_key" ON "sms_recipients"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "sms_recipients_testimonialId_key" ON "sms_recipients"("testimonialId");
CREATE INDEX IF NOT EXISTS "sms_recipients_campaignId_idx" ON "sms_recipients"("campaignId");
CREATE INDEX IF NOT EXISTS "sms_recipients_workspaceId_idx" ON "sms_recipients"("workspaceId");
CREATE INDEX IF NOT EXISTS "sms_recipients_phoneNumber_idx" ON "sms_recipients"("phoneNumber");
CREATE INDEX IF NOT EXISTS "sms_recipients_status_idx" ON "sms_recipients"("status");

ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. SMS Suppression (Opt-Out) Table
CREATE TABLE IF NOT EXISTS "sms_suppressions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'OPT_OUT',
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_suppressions_workspaceId_phoneNumber_key" ON "sms_suppressions"("workspaceId", "phoneNumber");
CREATE INDEX IF NOT EXISTS "sms_suppressions_workspaceId_idx" ON "sms_suppressions"("workspaceId");
ALTER TABLE "sms_suppressions" ADD CONSTRAINT "sms_suppressions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. SMS Provider Configuration Table
CREATE TABLE IF NOT EXISTS "sms_provider_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "accountSid" TEXT,
    "authToken" TEXT,
    "fromNumber" TEXT,
    "webhookUrl" TEXT,
    "webhookAuthHeader" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_provider_configs_workspaceId_key" ON "sms_provider_configs"("workspaceId");
CREATE INDEX IF NOT EXISTS "sms_provider_configs_workspaceId_idx" ON "sms_provider_configs"("workspaceId");
ALTER TABLE "sms_provider_configs" ADD CONSTRAINT "sms_provider_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

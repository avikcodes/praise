-- Additive migration for Praise Email Testimonial Invitations & Campaigns

-- Email Templates Table
CREATE TABLE IF NOT EXISTS "invitation_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "invitation_templates_workspaceId_idx" ON "invitation_templates"("workspaceId");
ALTER TABLE "invitation_templates" ADD CONSTRAINT "invitation_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS "email_campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "formId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "replyToEmail" TEXT,
    "fromName" TEXT,
    "senderEmail" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "submittedCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribedCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_campaigns_workspaceId_idx" ON "email_campaigns"("workspaceId");
CREATE INDEX IF NOT EXISTS "email_campaigns_workspaceId_status_idx" ON "email_campaigns"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "email_campaigns_formId_idx" ON "email_campaigns"("formId");

ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_formId_fkey" FOREIGN KEY ("formId") REFERENCES "collection_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "invitation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invitation Recipients Table
CREATE TABLE IF NOT EXISTS "invitation_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT,
    "token" TEXT NOT NULL,
    "customFieldsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "testimonialId" TEXT,
    "errorMessage" TEXT,
    "bounceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitation_recipients_token_key" ON "invitation_recipients"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_recipients_testimonialId_key" ON "invitation_recipients"("testimonialId");
CREATE INDEX IF NOT EXISTS "invitation_recipients_campaignId_idx" ON "invitation_recipients"("campaignId");
CREATE INDEX IF NOT EXISTS "invitation_recipients_workspaceId_idx" ON "invitation_recipients"("workspaceId");
CREATE INDEX IF NOT EXISTS "invitation_recipients_customerId_idx" ON "invitation_recipients"("customerId");
CREATE INDEX IF NOT EXISTS "invitation_recipients_status_idx" ON "invitation_recipients"("status");

ALTER TABLE "invitation_recipients" ADD CONSTRAINT "invitation_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation_recipients" ADD CONSTRAINT "invitation_recipients_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation_recipients" ADD CONSTRAINT "invitation_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invitation_recipients" ADD CONSTRAINT "invitation_recipients_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Email Suppressions Table (Unsubscribes, Bounces)
CREATE TABLE IF NOT EXISTS "email_suppressions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'UNSUBSCRIBE',
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_suppressions_workspaceId_email_key" ON "email_suppressions"("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "email_suppressions_workspaceId_idx" ON "email_suppressions"("workspaceId");

ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Additive migration for Praise Lightweight Customer CRM
-- Extends Customer with stage, website, and customAttributesJson
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customAttributesJson" TEXT;

CREATE INDEX IF NOT EXISTS "customers_workspaceId_stage_idx" ON "customers"("workspaceId", "stage");

-- Customer Lifecycle Stages Table
CREATE TABLE IF NOT EXISTS "customer_stages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#10B981',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_stages_workspaceId_key_key" ON "customer_stages"("workspaceId", "key");
CREATE INDEX IF NOT EXISTS "customer_stages_workspaceId_order_idx" ON "customer_stages"("workspaceId", "order");

ALTER TABLE "customer_stages" ADD CONSTRAINT "customer_stages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer Custom Attribute Definitions Table
CREATE TABLE IF NOT EXISTS "customer_attribute_definitions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "optionsJson" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_attribute_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_attribute_definitions_workspaceId_key_key" ON "customer_attribute_definitions"("workspaceId", "key");
CREATE INDEX IF NOT EXISTS "customer_attribute_definitions_workspaceId_order_idx" ON "customer_attribute_definitions"("workspaceId", "order");

ALTER TABLE "customer_attribute_definitions" ADD CONSTRAINT "customer_attribute_definitions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer Dynamic Segments & Saved Filters Table
CREATE TABLE IF NOT EXISTS "customer_segments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#7049D8',
    "icon" TEXT DEFAULT 'Users',
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "filterRulesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_segments_workspaceId_name_key" ON "customer_segments"("workspaceId", "name");
CREATE INDEX IF NOT EXISTS "customer_segments_workspaceId_idx" ON "customer_segments"("workspaceId");

ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer Internal Notes Table
CREATE TABLE IF NOT EXISTS "customer_notes" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_notes_workspaceId_idx" ON "customer_notes"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_notes_customerId_createdAt_idx" ON "customer_notes"("customerId", "createdAt");

ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer Activity History Table
CREATE TABLE IF NOT EXISTS "customer_activities" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_activities_workspaceId_idx" ON "customer_activities"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_activities_customerId_createdAt_idx" ON "customer_activities"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_activities_action_idx" ON "customer_activities"("action");

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer Tags Join Table
CREATE TABLE IF NOT EXISTS "customer_tags" (
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("customerId","tagId")
);

CREATE INDEX IF NOT EXISTS "customer_tags_workspaceId_idx" ON "customer_tags"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_tags_tagId_idx" ON "customer_tags"("tagId");

ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

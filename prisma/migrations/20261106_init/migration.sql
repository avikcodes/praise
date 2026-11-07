-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestimonialType" AS ENUM ('TEXT', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'URL', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CHECKBOX', 'STAR_RATING', 'TEXT', 'TEXTAREA', 'RATING', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('WALL_OF_LOVE', 'GRID', 'CAROUSEL', 'QUOTE_CARD');

-- CreateEnum
CREATE TYPE "WidgetTheme" AS ENUM ('LIGHT', 'DARK', 'WARM', 'AUTO');

-- CreateEnum
CREATE TYPE "WidgetEventType" AS ENUM ('IMPRESSION', 'INTERACTION', 'VIDEO_PLAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accentColor" TEXT DEFAULT '#7049D8',
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "color" TEXT DEFAULT '#7049D8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT,
    "avatarUrl" TEXT,
    "socialHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_forms" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "headerPrompt" TEXT NOT NULL,
    "thankYouMessage" TEXT DEFAULT 'Thank you for sharing your feedback!',
    "allowVideo" BOOLEAN NOT NULL DEFAULT true,
    "allowAudio" BOOLEAN NOT NULL DEFAULT true,
    "allowText" BOOLEAN NOT NULL DEFAULT true,
    "maxVideoDurationSeconds" INTEGER NOT NULL DEFAULT 120,
    "collectName" BOOLEAN NOT NULL DEFAULT true,
    "nameRequired" BOOLEAN NOT NULL DEFAULT true,
    "collectEmail" BOOLEAN NOT NULL DEFAULT true,
    "emailRequired" BOOLEAN NOT NULL DEFAULT true,
    "collectCompany" BOOLEAN NOT NULL DEFAULT true,
    "companyRequired" BOOLEAN NOT NULL DEFAULT false,
    "collectJobTitle" BOOLEAN NOT NULL DEFAULT false,
    "jobTitleRequired" BOOLEAN NOT NULL DEFAULT false,
    "collectWebsite" BOOLEAN NOT NULL DEFAULT false,
    "websiteRequired" BOOLEAN NOT NULL DEFAULT false,
    "collectRating" BOOLEAN NOT NULL DEFAULT true,
    "ratingRequired" BOOLEAN NOT NULL DEFAULT false,
    "collectText" BOOLEAN NOT NULL DEFAULT true,
    "textRequired" BOOLEAN NOT NULL DEFAULT true,
    "collectAvatar" BOOLEAN NOT NULL DEFAULT true,
    "collectConsent" BOOLEAN NOT NULL DEFAULT true,
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "consentText" TEXT NOT NULL DEFAULT 'I grant permission to use my feedback, name, and submitted media for public marketing purposes.',
    "submissionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "redirectUrl" TEXT,
    "customLogoUrl" TEXT,
    "accentColor" TEXT DEFAULT '#7049D8',
    "theme" TEXT DEFAULT 'warm',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "type" "FormFieldType" NOT NULL DEFAULT 'SHORT_TEXT',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "optionsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "formId" TEXT,
    "customerId" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 5,
    "type" "TestimonialType" NOT NULL DEFAULT 'TEXT',
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "type" "MediaType" NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "url" TEXT NOT NULL,
    "localPath" TEXT,
    "s3Key" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isConsentGranted" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#7049D8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonial_tags" (
    "testimonialId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonial_tags_pkey" PRIMARY KEY ("testimonialId","tagId")
);

-- CreateTable
CREATE TABLE "widgets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL DEFAULT 'WALL_OF_LOVE',
    "theme" "WidgetTheme" NOT NULL DEFAULT 'WARM',
    "configJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "eventType" "WidgetEventType" NOT NULL DEFAULT 'IMPRESSION',
    "visitorCountry" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "widget_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "brands_workspaceId_idx" ON "brands"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_workspaceId_slug_key" ON "brands"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");

-- CreateIndex
CREATE INDEX "projects_brandId_idx" ON "projects"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspaceId_slug_key" ON "projects"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "customers_workspaceId_idx" ON "customers"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspaceId_email_key" ON "customers"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "collection_forms_workspaceId_idx" ON "collection_forms"("workspaceId");

-- CreateIndex
CREATE INDEX "collection_forms_projectId_idx" ON "collection_forms"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_forms_workspaceId_slug_key" ON "collection_forms"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "form_fields_formId_idx" ON "form_fields"("formId");

-- CreateIndex
CREATE INDEX "testimonials_workspaceId_idx" ON "testimonials"("workspaceId");

-- CreateIndex
CREATE INDEX "testimonials_workspaceId_status_idx" ON "testimonials"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "testimonials_workspaceId_type_idx" ON "testimonials"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "testimonials_projectId_idx" ON "testimonials"("projectId");

-- CreateIndex
CREATE INDEX "testimonials_formId_idx" ON "testimonials"("formId");

-- CreateIndex
CREATE INDEX "testimonials_customerId_idx" ON "testimonials"("customerId");

-- CreateIndex
CREATE INDEX "media_assets_workspaceId_idx" ON "media_assets"("workspaceId");

-- CreateIndex
CREATE INDEX "media_assets_testimonialId_idx" ON "media_assets"("testimonialId");

-- CreateIndex
CREATE INDEX "consent_records_workspaceId_idx" ON "consent_records"("workspaceId");

-- CreateIndex
CREATE INDEX "consent_records_testimonialId_idx" ON "consent_records"("testimonialId");

-- CreateIndex
CREATE INDEX "tags_workspaceId_idx" ON "tags"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_workspaceId_name_key" ON "tags"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "testimonial_tags_workspaceId_idx" ON "testimonial_tags"("workspaceId");

-- CreateIndex
CREATE INDEX "testimonial_tags_tagId_idx" ON "testimonial_tags"("tagId");

-- CreateIndex
CREATE INDEX "widgets_workspaceId_idx" ON "widgets"("workspaceId");

-- CreateIndex
CREATE INDEX "widgets_projectId_idx" ON "widgets"("projectId");

-- CreateIndex
CREATE INDEX "widget_events_workspaceId_idx" ON "widget_events"("workspaceId");

-- CreateIndex
CREATE INDEX "widget_events_widgetId_idx" ON "widget_events"("widgetId");

-- CreateIndex
CREATE INDEX "widget_events_recordedAt_idx" ON "widget_events"("recordedAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_forms" ADD CONSTRAINT "collection_forms_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_forms" ADD CONSTRAINT "collection_forms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formId_fkey" FOREIGN KEY ("formId") REFERENCES "collection_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_formId_fkey" FOREIGN KEY ("formId") REFERENCES "collection_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonial_tags" ADD CONSTRAINT "testimonial_tags_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonial_tags" ADD CONSTRAINT "testimonial_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_events" ADD CONSTRAINT "widget_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_events" ADD CONSTRAINT "widget_events_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "widgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


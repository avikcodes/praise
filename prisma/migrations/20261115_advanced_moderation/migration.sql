-- AlterTable: Add source, import, duplicate, and media hash fields to testimonials
ALTER TABLE "testimonials" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'FORM';
ALTER TABLE "testimonials" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "importBatchId" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "importSourceDetailsJson" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "mediaHash" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "isFlaggedDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "testimonials" ADD COLUMN "duplicateOfId" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "duplicateConfirmedAt" TIMESTAMP(3);
ALTER TABLE "testimonials" ADD COLUMN "duplicateConfirmedBy" TEXT;
ALTER TABLE "testimonials" ADD COLUMN "duplicateDismissedAt" TIMESTAMP(3);
ALTER TABLE "testimonials" ADD COLUMN "duplicateDismissedBy" TEXT;

-- AlterTable: Add fileHash to media_assets
ALTER TABLE "media_assets" ADD COLUMN "fileHash" TEXT;

-- CreateTable: testimonial_notes
CREATE TABLE "testimonial_notes" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: moderation_activities
CREATE TABLE "moderation_activities" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "details" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "testimonials_workspaceId_sourceType_idx" ON "testimonials"("workspaceId", "sourceType");
CREATE INDEX "testimonials_workspaceId_isFlaggedDuplicate_idx" ON "testimonials"("workspaceId", "isFlaggedDuplicate");

CREATE INDEX "testimonial_notes_workspaceId_idx" ON "testimonial_notes"("workspaceId");
CREATE INDEX "testimonial_notes_testimonialId_idx" ON "testimonial_notes"("testimonialId");

CREATE INDEX "moderation_activities_workspaceId_idx" ON "moderation_activities"("workspaceId");
CREATE INDEX "moderation_activities_testimonialId_idx" ON "moderation_activities"("testimonialId");
CREATE INDEX "moderation_activities_action_idx" ON "moderation_activities"("action");
CREATE INDEX "moderation_activities_createdAt_idx" ON "moderation_activities"("createdAt");

-- AddForeignKey
ALTER TABLE "testimonial_notes" ADD CONSTRAINT "testimonial_notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "testimonial_notes" ADD CONSTRAINT "testimonial_notes_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_activities" ADD CONSTRAINT "moderation_activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_activities" ADD CONSTRAINT "moderation_activities_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

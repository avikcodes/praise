-- CreateEnum
CREATE TYPE "VideoExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoAspectRatio" AS ENUM ('ORIGINAL', 'RATIO_16_9', 'RATIO_9_16', 'RATIO_1_1', 'RATIO_4_5');

-- CreateEnum
CREATE TYPE "VideoResolutionProfile" AS ENUM ('RES_720P', 'RES_1080P', 'RES_4K');

-- CreateTable
CREATE TABLE "video_export_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "sourceMediaAssetId" TEXT NOT NULL,
    "exportedMediaAssetId" TEXT,
    "status" "VideoExportStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "aspectRatio" "VideoAspectRatio" NOT NULL DEFAULT 'ORIGINAL',
    "resolutionProfile" "VideoResolutionProfile" NOT NULL DEFAULT 'RES_1080P',
    "burnSubtitles" BOOLEAN NOT NULL DEFAULT true,
    "subtitleFont" TEXT NOT NULL DEFAULT 'sans-serif',
    "subtitleSize" TEXT NOT NULL DEFAULT 'medium',
    "subtitlePosition" TEXT NOT NULL DEFAULT 'bottom',
    "subtitleColor" TEXT NOT NULL DEFAULT '#ffffff',
    "subtitleBgColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.6)',
    "customSegmentsJson" TEXT,
    "outputUrl" TEXT,
    "fileSizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "sourceResolution" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_export_jobs_exportedMediaAssetId_key" ON "video_export_jobs"("exportedMediaAssetId");

-- CreateIndex
CREATE INDEX "video_export_jobs_workspaceId_idx" ON "video_export_jobs"("workspaceId");

-- CreateIndex
CREATE INDEX "video_export_jobs_testimonialId_idx" ON "video_export_jobs"("testimonialId");

-- CreateIndex
CREATE INDEX "video_export_jobs_sourceMediaAssetId_idx" ON "video_export_jobs"("sourceMediaAssetId");

-- CreateIndex
CREATE INDEX "video_export_jobs_status_idx" ON "video_export_jobs"("status");

-- AddForeignKey
ALTER TABLE "video_export_jobs" ADD CONSTRAINT "video_export_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_export_jobs" ADD CONSTRAINT "video_export_jobs_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_export_jobs" ADD CONSTRAINT "video_export_jobs_sourceMediaAssetId_fkey" FOREIGN KEY ("sourceMediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_export_jobs" ADD CONSTRAINT "video_export_jobs_exportedMediaAssetId_fkey" FOREIGN KEY ("exportedMediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

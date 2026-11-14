-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "media_transcriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'whisper',
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "text" TEXT,
    "rawText" TEXT,
    "language" TEXT,
    "confidence" DOUBLE PRECISION,
    "durationSeconds" INTEGER,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editedByUserId" TEXT,
    "metadataJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_transcriptions_mediaAssetId_key" ON "media_transcriptions"("mediaAssetId");

-- CreateIndex
CREATE INDEX "media_transcriptions_workspaceId_idx" ON "media_transcriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "media_transcriptions_mediaAssetId_idx" ON "media_transcriptions"("mediaAssetId");

-- CreateIndex
CREATE INDEX "media_transcriptions_testimonialId_idx" ON "media_transcriptions"("testimonialId");

-- CreateIndex
CREATE INDEX "media_transcriptions_status_idx" ON "media_transcriptions"("status");

-- AddForeignKey
ALTER TABLE "media_transcriptions" ADD CONSTRAINT "media_transcriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_transcriptions" ADD CONSTRAINT "media_transcriptions_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_transcriptions" ADD CONSTRAINT "media_transcriptions_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

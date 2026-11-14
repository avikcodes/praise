-- AlterTable
ALTER TABLE "collection_forms" ADD COLUMN "videoInstructions" TEXT;
ALTER TABLE "collection_forms" ADD COLUMN "recordingQuestionsJson" TEXT;

-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN "recordingQuestionsJson" TEXT;

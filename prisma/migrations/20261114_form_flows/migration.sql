-- AlterTable
ALTER TABLE "collection_forms" ADD COLUMN "isMultiStep" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "collection_forms" ADD COLUMN "flowConfigJson" TEXT;

-- AlterTable
ALTER TABLE "form_fields" ADD COLUMN "conditionsJson" TEXT;

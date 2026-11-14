-- AlterEnum
ALTER TYPE "FormFieldType" ADD VALUE 'NUMBER';
ALTER TYPE "FormFieldType" ADD VALUE 'PHONE';
ALTER TYPE "FormFieldType" ADD VALUE 'DATE';
ALTER TYPE "FormFieldType" ADD VALUE 'DROPDOWN';
ALTER TYPE "FormFieldType" ADD VALUE 'FILE_UPLOAD';
ALTER TYPE "FormFieldType" ADD VALUE 'WEBSITE';
ALTER TYPE "FormFieldType" ADD VALUE 'LONG_FORM';
ALTER TYPE "FormFieldType" ADD VALUE 'CUSTOMER_ROLE';
ALTER TYPE "FormFieldType" ADD VALUE 'COMPANY_SIZE';
ALTER TYPE "FormFieldType" ADD VALUE 'PRODUCT_PLAN';

-- AlterTable
ALTER TABLE "collection_forms" ADD COLUMN "customCss" TEXT;

-- AlterTable
ALTER TABLE "form_fields" ADD COLUMN "helpText" TEXT;
ALTER TABLE "form_fields" ADD COLUMN "validationRulesJson" TEXT;

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "icon" TEXT DEFAULT 'file-text',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "configJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_templates_workspaceId_idx" ON "form_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "form_templates_category_idx" ON "form_templates"("category");

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

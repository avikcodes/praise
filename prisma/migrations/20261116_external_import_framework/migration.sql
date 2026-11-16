-- CreateTable ImportBatch
CREATE TABLE IF NOT EXISTS "import_batches" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicatesCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" TEXT,
    "configJson" TEXT,
    "importedByUserId" TEXT,
    "importedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "import_batches_workspaceId_idx" ON "import_batches"("workspaceId");
CREATE INDEX IF NOT EXISTS "import_batches_workspaceId_sourcePlatform_idx" ON "import_batches"("workspaceId", "sourcePlatform");
CREATE INDEX IF NOT EXISTS "import_batches_workspaceId_createdAt_idx" ON "import_batches"("workspaceId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "platform_connections" ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "syncFrequency" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN "nextSyncAt" TIMESTAMP(3),
ADD COLUMN "lastSyncStatus" TEXT,
ADD COLUMN "lastSuccessfulSyncAt" TIMESTAMP(3),
ADD COLUMN "lastSeenTimestamp" TIMESTAMP(3),
ADD COLUMN "lastSeenCursor" TEXT,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "targetProjectId" TEXT;

-- CreateTable
CREATE TABLE "platform_sync_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsImported" INTEGER NOT NULL DEFAULT 0,
    "duplicatesSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "cursorBefore" TEXT,
    "cursorAfter" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "platform_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_connections_syncEnabled_nextSyncAt_idx" ON "platform_connections"("syncEnabled", "nextSyncAt");

-- CreateIndex
CREATE INDEX "platform_sync_logs_workspaceId_connectionId_idx" ON "platform_sync_logs"("workspaceId", "connectionId");

-- CreateIndex
CREATE INDEX "platform_sync_logs_connectionId_startedAt_idx" ON "platform_sync_logs"("connectionId", "startedAt");

-- AddForeignKey
ALTER TABLE "platform_sync_logs" ADD CONSTRAINT "platform_sync_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "platform_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_sync_logs" ADD CONSTRAINT "platform_sync_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

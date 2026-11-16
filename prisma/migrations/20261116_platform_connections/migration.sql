-- CreateTable
CREATE TABLE "platform_connections" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountIdentifier" TEXT NOT NULL,
    "accountName" TEXT,
    "authType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "encryptedCredentials" TEXT NOT NULL,
    "scopes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_workspaceId_platform_accountIdentifier_key" ON "platform_connections"("workspaceId", "platform", "accountIdentifier");

-- CreateIndex
CREATE INDEX "platform_connections_workspaceId_idx" ON "platform_connections"("workspaceId");

-- CreateIndex
CREATE INDEX "platform_connections_workspaceId_platform_idx" ON "platform_connections"("workspaceId", "platform");

-- AddForeignKey
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

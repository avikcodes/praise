-- AlterTable "brands"
ALTER TABLE "brands" ADD COLUMN "tagline" TEXT;
ALTER TABLE "brands" ADD COLUMN "description" TEXT;
ALTER TABLE "brands" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'WARM';
ALTER TABLE "brands" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "brands" ADD COLUMN "selectedWallIds" TEXT;
ALTER TABLE "brands" ADD COLUMN "featuredTestimonialIds" TEXT;
ALTER TABLE "brands" ADD COLUMN "ctaEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "brands" ADD COLUMN "ctaLabel" TEXT DEFAULT 'Visit Website';
ALTER TABLE "brands" ADD COLUMN "ctaUrl" TEXT;
ALTER TABLE "brands" ADD COLUMN "ctaSecondaryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "brands" ADD COLUMN "ctaSecondaryLabel" TEXT DEFAULT 'Share Praise';
ALTER TABLE "brands" ADD COLUMN "ctaSecondaryUrl" TEXT;
ALTER TABLE "brands" ADD COLUMN "socialLinksJson" TEXT;
ALTER TABLE "brands" ADD COLUMN "viewsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable "custom_domains"
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "wallOfLoveId" TEXT,
    "brandId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verificationToken" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL DEFAULT 'TXT',
    "cnameTarget" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "tlsProvisioning" TEXT NOT NULL DEFAULT 'REVERSE_PROXY',
    "canonicalRedirect" BOOLEAN NOT NULL DEFAULT true,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");
CREATE INDEX "custom_domains_workspaceId_idx" ON "custom_domains"("workspaceId");
CREATE INDEX "custom_domains_domain_idx" ON "custom_domains"("domain");
CREATE INDEX "custom_domains_wallOfLoveId_idx" ON "custom_domains"("wallOfLoveId");
CREATE INDEX "custom_domains_brandId_idx" ON "custom_domains"("brandId");

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_wallOfLoveId_fkey" FOREIGN KEY ("wallOfLoveId") REFERENCES "walls_of_love"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

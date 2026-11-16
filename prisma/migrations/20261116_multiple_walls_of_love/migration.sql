-- CreateTable
CREATE TABLE "walls_of_love" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'WARM',
    "layout" TEXT NOT NULL DEFAULT 'MASONRY',
    "ordering" TEXT NOT NULL DEFAULT 'FEATURED_FIRST',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "tagFilter" TEXT,
    "selectedTestimonialIds" TEXT,
    "minRating" INTEGER NOT NULL DEFAULT 0,
    "primaryColor" TEXT DEFAULT '#7049D8',
    "customLogoUrl" TEXT,
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ctaLabel" TEXT DEFAULT 'Share Your Praise',
    "ctaUrl" TEXT,
    "ctaSecondaryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ctaSecondaryLabel" TEXT,
    "ctaSecondaryUrl" TEXT,
    "showRatings" BOOLEAN NOT NULL DEFAULT true,
    "showCompany" BOOLEAN NOT NULL DEFAULT true,
    "showAvatar" BOOLEAN NOT NULL DEFAULT true,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "showTags" BOOLEAN NOT NULL DEFAULT true,
    "showSource" BOOLEAN NOT NULL DEFAULT true,
    "showFeaturedBadge" BOOLEAN NOT NULL DEFAULT true,
    "allowVideoPlayback" BOOLEAN NOT NULL DEFAULT true,
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    "customCss" TEXT,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "walls_of_love_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "walls_of_love_workspaceId_slug_key" ON "walls_of_love"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "walls_of_love_workspaceId_idx" ON "walls_of_love"("workspaceId");

-- CreateIndex
CREATE INDEX "walls_of_love_projectId_idx" ON "walls_of_love"("projectId");

-- CreateIndex
CREATE INDEX "walls_of_love_slug_idx" ON "walls_of_love"("slug");

-- AddForeignKey
ALTER TABLE "walls_of_love" ADD CONSTRAINT "walls_of_love_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walls_of_love" ADD CONSTRAINT "walls_of_love_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

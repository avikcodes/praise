-- AlterTable RewardProgram
ALTER TABLE "reward_programs" ADD COLUMN IF NOT EXISTS "wheelEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reward_programs" ADD COLUMN IF NOT EXISTS "wheelConfigJson" TEXT;

-- AlterTable RewardClaim
ALTER TABLE "reward_claims" ADD COLUMN IF NOT EXISTS "claimToken" TEXT;
ALTER TABLE "reward_claims" ADD COLUMN IF NOT EXISTS "isWheelSpin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reward_claims" ADD COLUMN IF NOT EXISTS "selectedOptionId" TEXT;
ALTER TABLE "reward_claims" ADD COLUMN IF NOT EXISTS "selectedOptionLabel" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reward_claims_claimToken_key" ON "reward_claims"("claimToken");

-- CreateTable CustomerThankYou
CREATE TABLE IF NOT EXISTS "customer_thank_yous" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "customerId" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoAssetId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByUserId" TEXT,
    "sentByName" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_thank_yous_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_thank_yous_workspaceId_idx" ON "customer_thank_yous"("workspaceId");
CREATE INDEX IF NOT EXISTS "customer_thank_yous_testimonialId_idx" ON "customer_thank_yous"("testimonialId");
CREATE INDEX IF NOT EXISTS "customer_thank_yous_customerId_idx" ON "customer_thank_yous"("customerId");
CREATE INDEX IF NOT EXISTS "customer_thank_yous_workspaceId_channel_idx" ON "customer_thank_yous"("workspaceId", "channel");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "customer_thank_yous" ADD CONSTRAINT "customer_thank_yous_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_thank_yous" ADD CONSTRAINT "customer_thank_yous_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_thank_yous" ADD CONSTRAINT "customer_thank_yous_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

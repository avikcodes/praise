-- AlterTable CollectionForm
ALTER TABLE "collection_forms" ADD COLUMN IF NOT EXISTS "rewardEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "collection_forms" ADD COLUMN IF NOT EXISTS "rewardProgramId" TEXT;

-- CreateTable RewardProgram
CREATE TABLE IF NOT EXISTS "reward_programs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rewardType" TEXT NOT NULL DEFAULT 'COUPON_CODE',
    "couponCode" TEXT,
    "rewardUrl" TEXT,
    "digitalGiftUrl" TEXT,
    "instructions" TEXT,
    "disclosureText" TEXT,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'INSTANT_ON_SUBMISSION',
    "providerType" TEXT NOT NULL DEFAULT 'BUILT_IN',
    "providerConfigJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRewardsTotal" INTEGER,
    "claimsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable RewardClaim
CREATE TABLE IF NOT EXISTS "reward_claims" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "rewardProgramId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "customerId" TEXT,
    "formId" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "rewardType" TEXT NOT NULL,
    "rewardCode" TEXT,
    "rewardUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryMethod" TEXT NOT NULL DEFAULT 'INSTANT',
    "deliveredAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "providerReference" TEXT,
    "errorMessage" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "collection_forms_rewardProgramId_idx" ON "collection_forms"("rewardProgramId");
CREATE INDEX IF NOT EXISTS "reward_programs_workspaceId_idx" ON "reward_programs"("workspaceId");
CREATE INDEX IF NOT EXISTS "reward_programs_workspaceId_isActive_idx" ON "reward_programs"("workspaceId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "reward_claims_testimonialId_key" ON "reward_claims"("testimonialId");
CREATE INDEX IF NOT EXISTS "reward_claims_workspaceId_idx" ON "reward_claims"("workspaceId");
CREATE INDEX IF NOT EXISTS "reward_claims_workspaceId_status_idx" ON "reward_claims"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "reward_claims_rewardProgramId_idx" ON "reward_claims"("rewardProgramId");
CREATE INDEX IF NOT EXISTS "reward_claims_customerId_idx" ON "reward_claims"("customerId");
CREATE INDEX IF NOT EXISTS "reward_claims_formId_idx" ON "reward_claims"("formId");

-- AddForeignKey
ALTER TABLE "collection_forms" ADD CONSTRAINT "collection_forms_rewardProgramId_fkey" FOREIGN KEY ("rewardProgramId") REFERENCES "reward_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reward_programs" ADD CONSTRAINT "reward_programs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_rewardProgramId_fkey" FOREIGN KEY ("rewardProgramId") REFERENCES "reward_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "testimonials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_formId_fkey" FOREIGN KEY ("formId") REFERENCES "collection_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

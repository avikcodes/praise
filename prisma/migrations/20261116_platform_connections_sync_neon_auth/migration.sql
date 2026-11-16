-- AlterTable
-- Make passwordHash optional because Neon Auth manages credentials in neon_auth schema
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "costLastUpdated" TIMESTAMP(3),
ADD COLUMN     "costSource" TEXT DEFAULT 'MANUAL';

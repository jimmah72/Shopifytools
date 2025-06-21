/*
  Warnings:

  - You are about to drop the column `shippingCostRate` on the `FeeConfiguration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeeConfiguration" DROP COLUMN "shippingCostRate",
ADD COLUMN     "miscCostPerItem" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
ADD COLUMN     "miscCostPerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
ADD COLUMN     "overheadCostPerItem" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
ADD COLUMN     "overheadCostPerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.00;

/*
  Warnings:

  - You are about to drop the column `miscCostRate` on the `FeeConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `overheadCostRate` on the `FeeConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `returnRate` on the `FeeConfiguration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeeConfiguration" DROP COLUMN "miscCostRate",
DROP COLUMN "overheadCostRate",
DROP COLUMN "returnRate",
ADD COLUMN     "returnProcessingRate" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
ADD COLUMN     "usePaymentMethodFees" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "defaultCogRate" SET DEFAULT 0.30,
ALTER COLUMN "chargebackRate" SET DEFAULT 0.006;

-- AlterTable
ALTER TABLE "ShopifyOrder" ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentSource" TEXT,
ADD COLUMN     "transactionGateway" TEXT;

-- CreateTable
CREATE TABLE "PaymentMethodFee" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "percentageRate" DOUBLE PRECISION NOT NULL,
    "fixedFee" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMethodFee_storeId_idx" ON "PaymentMethodFee"("storeId");

-- CreateIndex
CREATE INDEX "PaymentMethodFee_paymentMethod_idx" ON "PaymentMethodFee"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodFee_storeId_paymentMethod_key" ON "PaymentMethodFee"("storeId", "paymentMethod");

-- CreateIndex
CREATE INDEX "ShopifyOrder_paymentMethod_idx" ON "ShopifyOrder"("paymentMethod");

-- AddForeignKey
ALTER TABLE "PaymentMethodFee" ADD CONSTRAINT "PaymentMethodFee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

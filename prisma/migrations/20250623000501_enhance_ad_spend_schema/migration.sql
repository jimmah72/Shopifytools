/*
  Warnings:

  - You are about to drop the column `amount` on the `AdSpend` table. All the data in the column will be lost.
  - You are about to drop the column `lastSync` on the `AdSpend` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `FixedCost` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `FixedCost` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `FixedCost` table. All the data in the column will be lost.
  - You are about to drop the column `adSpend` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `externalFee` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `fixedFee` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillmentStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `percentageFee` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shippingRuleId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `externalFee` on the `PaymentGateway` table. All the data in the column will be lost.
  - You are about to drop the column `fixedFee` on the `PaymentGateway` table. All the data in the column will be lost.
  - You are about to drop the column `percentageFee` on the `PaymentGateway` table. All the data in the column will be lost.
  - You are about to drop the column `baseRate` on the `ShippingRule` table. All the data in the column will be lost.
  - You are about to drop the column `perItemRate` on the `ShippingRule` table. All the data in the column will be lost.
  - You are about to drop the column `weightRate` on the `ShippingRule` table. All the data in the column will be lost.
  - You are about to drop the column `amountPerOrder` on the `VariableCost` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `VariableCost` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `VariableCost` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `VariableCost` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[storeId,platform,campaignId,adsetId,date]` on the table `AdSpend` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `spend` to the `AdSpend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processingFee` to the `PaymentGateway` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost` to the `ShippingRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `VariableCost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `VariableCost` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_paymentGatewayId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_shippingRuleId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_variantId_fkey";

-- DropIndex
DROP INDEX "AdSpend_platform_accountId_idx";

-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_paymentGatewayId_idx";

-- DropIndex
DROP INDEX "Order_shippingRuleId_idx";

-- DropIndex
DROP INDEX "Order_variantId_idx";

-- AlterTable
ALTER TABLE "AdSpend" DROP COLUMN "amount",
DROP COLUMN "lastSync",
ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "adId" TEXT,
ADD COLUMN     "adName" TEXT,
ADD COLUMN     "adsetId" TEXT,
ADD COLUMN     "adsetName" TEXT,
ADD COLUMN     "campaignName" TEXT,
ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "conversions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cpc" DOUBLE PRECISION,
ADD COLUMN     "cpm" DOUBLE PRECISION,
ADD COLUMN     "ctr" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'n8n_webhook',
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rawData" JSONB,
ADD COLUMN     "roas" DOUBLE PRECISION,
ADD COLUMN     "spend" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ALTER COLUMN "accountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AdSpendIntegration" ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "FixedCost" DROP COLUMN "category",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "adSpend",
DROP COLUMN "cost",
DROP COLUMN "customerId",
DROP COLUMN "externalFee",
DROP COLUMN "fixedFee",
DROP COLUMN "fulfillmentStatus",
DROP COLUMN "paymentGatewayId",
DROP COLUMN "percentageFee",
DROP COLUMN "price",
DROP COLUMN "quantity",
DROP COLUMN "shippingRuleId",
DROP COLUMN "variantId",
ADD COLUMN     "costOfGoodsSold" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "orderDate" TIMESTAMP(3),
ADD COLUMN     "orderName" TEXT,
ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "productVariantId" TEXT,
ADD COLUMN     "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "shippingCost" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "PaymentGateway" DROP COLUMN "externalFee",
DROP COLUMN "fixedFee",
DROP COLUMN "percentageFee",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "processingFee" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "ShippingRule" DROP COLUMN "baseRate",
DROP COLUMN "perItemRate",
DROP COLUMN "weightRate",
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentStoreId" TEXT,
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VariableCost" DROP COLUMN "amountPerOrder",
DROP COLUMN "category",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "UserStoreAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "UserStoreAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStoreAccess_userId_idx" ON "UserStoreAccess"("userId");

-- CreateIndex
CREATE INDEX "UserStoreAccess_storeId_idx" ON "UserStoreAccess"("storeId");

-- CreateIndex
CREATE INDEX "UserStoreAccess_userId_isActive_idx" ON "UserStoreAccess"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserStoreAccess_role_idx" ON "UserStoreAccess"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserStoreAccess_userId_storeId_key" ON "UserStoreAccess"("userId", "storeId");

-- CreateIndex
CREATE INDEX "AdSpend_platform_idx" ON "AdSpend"("platform");

-- CreateIndex
CREATE INDEX "AdSpend_date_idx" ON "AdSpend"("date");

-- CreateIndex
CREATE INDEX "AdSpend_campaignId_idx" ON "AdSpend"("campaignId");

-- CreateIndex
CREATE INDEX "AdSpend_utmCampaign_idx" ON "AdSpend"("utmCampaign");

-- CreateIndex
CREATE INDEX "AdSpend_storeId_platform_date_idx" ON "AdSpend"("storeId", "platform", "date");

-- CreateIndex
CREATE INDEX "AdSpend_storeId_date_idx" ON "AdSpend"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpend_storeId_platform_campaignId_adsetId_date_key" ON "AdSpend"("storeId", "platform", "campaignId", "adsetId", "date");

-- CreateIndex
CREATE INDEX "AdSpendIntegration_isActive_idx" ON "AdSpendIntegration"("isActive");

-- CreateIndex
CREATE INDEX "Order_productVariantId_idx" ON "Order"("productVariantId");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Store_isActive_idx" ON "Store"("isActive");

-- CreateIndex
CREATE INDEX "Store_isArchived_idx" ON "Store"("isArchived");

-- CreateIndex
CREATE INDEX "Store_domain_idx" ON "Store"("domain");

-- CreateIndex
CREATE INDEX "User_currentStoreId_idx" ON "User"("currentStoreId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "UserStoreAccess" ADD CONSTRAINT "UserStoreAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoreAccess" ADD CONSTRAINT "UserStoreAccess_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentStoreId_fkey" FOREIGN KEY ("currentStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

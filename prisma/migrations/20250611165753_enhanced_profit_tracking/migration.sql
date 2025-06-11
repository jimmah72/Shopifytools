/*
  Warnings:

  - Added the required column `accountId` to the `AdSpend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastSync` to the `AdSpend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalFee` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fixedFee` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentGatewayId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percentageFee` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCost` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingRuleId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AdSpend" ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "lastSync" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "externalFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fixedFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "paymentGatewayId" TEXT NOT NULL,
ADD COLUMN     "percentageFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shippingRuleId" TEXT NOT NULL,
ADD COLUMN     "variantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "shippingRuleId" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "inventoryQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "perItemRate" DOUBLE PRECISION NOT NULL,
    "weightRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fixedFee" DOUBLE PRECISION NOT NULL,
    "percentageFee" DOUBLE PRECISION NOT NULL,
    "externalFee" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedCost" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariableCost" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountPerOrder" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ShippingRule_storeId_idx" ON "ShippingRule"("storeId");

-- CreateIndex
CREATE INDEX "PaymentGateway_storeId_idx" ON "PaymentGateway"("storeId");

-- CreateIndex
CREATE INDEX "FixedCost_storeId_idx" ON "FixedCost"("storeId");

-- CreateIndex
CREATE INDEX "VariableCost_storeId_idx" ON "VariableCost"("storeId");

-- CreateIndex
CREATE INDEX "AdSpend_platform_accountId_idx" ON "AdSpend"("platform", "accountId");

-- CreateIndex
CREATE INDEX "Order_variantId_idx" ON "Order"("variantId");

-- CreateIndex
CREATE INDEX "Order_shippingRuleId_idx" ON "Order"("shippingRuleId");

-- CreateIndex
CREATE INDEX "Order_paymentGatewayId_idx" ON "Order"("paymentGatewayId");

-- CreateIndex
CREATE INDEX "Product_shippingRuleId_idx" ON "Product"("shippingRuleId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shippingRuleId_fkey" FOREIGN KEY ("shippingRuleId") REFERENCES "ShippingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRule" ADD CONSTRAINT "ShippingRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGateway" ADD CONSTRAINT "PaymentGateway_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingRuleId_fkey" FOREIGN KEY ("shippingRuleId") REFERENCES "ShippingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentGatewayId_fkey" FOREIGN KEY ("paymentGatewayId") REFERENCES "PaymentGateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableCost" ADD CONSTRAINT "VariableCost_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

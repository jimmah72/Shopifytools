/*
  Warnings:

  - You are about to drop the column `inventoryCost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryCostUpdatedAt` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "inventoryCost",
DROP COLUMN "inventoryCostUpdatedAt";

-- CreateTable
CREATE TABLE "ShopifyOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyOrderNumber" INTEGER NOT NULL,
    "orderName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "subtotalPrice" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "totalDiscounts" DOUBLE PRECISION NOT NULL,
    "totalShipping" DOUBLE PRECISION NOT NULL,
    "financialStatus" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL,
    "customerFirstName" TEXT,
    "customerLastName" TEXT,
    "customerEmail" TEXT,
    "shippingFirstName" TEXT,
    "shippingLastName" TEXT,
    "shippingAddress1" TEXT,
    "shippingCity" TEXT,
    "shippingProvince" TEXT,
    "shippingCountry" TEXT,
    "shippingZip" TEXT,
    "gateway" TEXT,
    "processingMethod" TEXT,
    "tags" TEXT,
    "note" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "productType" TEXT,
    "vendor" TEXT,
    "fulfillableQuantity" INTEGER NOT NULL DEFAULT 0,
    "fulfillmentService" TEXT,

    CONSTRAINT "ShopifyLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT,
    "vendor" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "images" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "costPerItem" DOUBLE PRECISION,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "inventoryPolicy" TEXT,
    "inventoryManagement" TEXT,
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT,
    "fulfillmentService" TEXT,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,

    CONSTRAINT "ShopifyProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncStatus" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOrderId" TEXT,
    "lastProductId" TEXT,
    "lastCreatedAt" TIMESTAMP(3),
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "SyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyOrder_storeId_idx" ON "ShopifyOrder"("storeId");

-- CreateIndex
CREATE INDEX "ShopifyOrder_createdAt_idx" ON "ShopifyOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ShopifyOrder_financialStatus_idx" ON "ShopifyOrder"("financialStatus");

-- CreateIndex
CREATE INDEX "ShopifyOrder_fulfillmentStatus_idx" ON "ShopifyOrder"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "ShopifyOrder_lastSyncedAt_idx" ON "ShopifyOrder"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "ShopifyLineItem_orderId_idx" ON "ShopifyLineItem"("orderId");

-- CreateIndex
CREATE INDEX "ShopifyLineItem_productId_idx" ON "ShopifyLineItem"("productId");

-- CreateIndex
CREATE INDEX "ShopifyLineItem_variantId_idx" ON "ShopifyLineItem"("variantId");

-- CreateIndex
CREATE INDEX "ShopifyProduct_storeId_idx" ON "ShopifyProduct"("storeId");

-- CreateIndex
CREATE INDEX "ShopifyProduct_handle_idx" ON "ShopifyProduct"("handle");

-- CreateIndex
CREATE INDEX "ShopifyProduct_status_idx" ON "ShopifyProduct"("status");

-- CreateIndex
CREATE INDEX "ShopifyProduct_lastSyncedAt_idx" ON "ShopifyProduct"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "ShopifyProductVariant_productId_idx" ON "ShopifyProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ShopifyProductVariant_sku_idx" ON "ShopifyProductVariant"("sku");

-- CreateIndex
CREATE INDEX "SyncStatus_storeId_idx" ON "SyncStatus"("storeId");

-- CreateIndex
CREATE INDEX "SyncStatus_dataType_idx" ON "SyncStatus"("dataType");

-- CreateIndex
CREATE UNIQUE INDEX "SyncStatus_storeId_dataType_key" ON "SyncStatus"("storeId", "dataType");

-- AddForeignKey
ALTER TABLE "ShopifyOrder" ADD CONSTRAINT "ShopifyOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyLineItem" ADD CONSTRAINT "ShopifyLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyProduct" ADD CONSTRAINT "ShopifyProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyProductVariant" ADD CONSTRAINT "ShopifyProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopifyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncStatus" ADD CONSTRAINT "SyncStatus_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

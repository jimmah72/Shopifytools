/*
  Warnings:

  - A unique constraint covering the columns `[shopifyId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "shopifyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopifyId_key" ON "Product"("shopifyId");

-- CreateIndex
CREATE INDEX "Product_shopifyId_idx" ON "Product"("shopifyId");

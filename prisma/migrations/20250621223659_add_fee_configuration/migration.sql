-- CreateTable
CREATE TABLE "FeeConfiguration" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "paymentGatewayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.029,
    "processingFeePerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "defaultCogRate" DOUBLE PRECISION NOT NULL DEFAULT 0.40,
    "overheadCostRate" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "shippingCostRate" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "miscCostRate" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "chargebackRate" DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    "returnRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeConfiguration_storeId_key" ON "FeeConfiguration"("storeId");

-- CreateIndex
CREATE INDEX "FeeConfiguration_storeId_idx" ON "FeeConfiguration"("storeId");

-- AddForeignKey
ALTER TABLE "FeeConfiguration" ADD CONSTRAINT "FeeConfiguration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AdditionalCost" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentagePerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "percentagePerItem" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "flatRatePerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "flatRatePerItem" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionFee" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "monthlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "yearlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalCost_storeId_idx" ON "AdditionalCost"("storeId");

-- CreateIndex
CREATE INDEX "AdditionalCost_storeId_isActive_idx" ON "AdditionalCost"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "SubscriptionFee_storeId_idx" ON "SubscriptionFee"("storeId");

-- CreateIndex
CREATE INDEX "SubscriptionFee_storeId_isActive_idx" ON "SubscriptionFee"("storeId", "isActive");

-- AddForeignKey
ALTER TABLE "AdditionalCost" ADD CONSTRAINT "AdditionalCost_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionFee" ADD CONSTRAINT "SubscriptionFee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

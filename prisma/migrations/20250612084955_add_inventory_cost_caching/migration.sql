-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inventoryCost" DOUBLE PRECISION,
ADD COLUMN     "inventoryCostUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdSpendIntegration" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "accountData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpendIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSpendIntegration_storeId_idx" ON "AdSpendIntegration"("storeId");

-- CreateIndex
CREATE INDEX "AdSpendIntegration_platform_idx" ON "AdSpendIntegration"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpendIntegration_storeId_platform_key" ON "AdSpendIntegration"("storeId", "platform");

-- AddForeignKey
ALTER TABLE "AdSpendIntegration" ADD CONSTRAINT "AdSpendIntegration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

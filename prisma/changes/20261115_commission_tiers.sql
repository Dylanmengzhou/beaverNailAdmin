-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "commissionPolicySnapshot" JSONB,
ADD COLUMN     "commissionRevenueBasis" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SettlementRequest" ADD COLUMN     "approvedCommissionAmount" INTEGER,
ADD COLUMN     "approvedCommissionRateBps" INTEGER,
ADD COLUMN     "approvedRevenueBasis" DOUBLE PRECISION,
ADD COLUMN     "commissionPolicySnapshot" JSONB,
ADD COLUMN     "commissionRevenueBasis" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CommissionPolicy" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nailArtistId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "effectiveFrom" TEXT NOT NULL,
    "tiers" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionAdjustment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "reservationKey" TEXT NOT NULL,
    "triggerKey" TEXT NOT NULL,
    "nailArtistId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "finalPrice" INTEGER NOT NULL,
    "previousAmount" INTEGER,
    "commissionAmount" INTEGER NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "revenueBasis" DOUBLE PRECISION NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionPolicy_serviceId_currency_effectiveFrom_idx" ON "CommissionPolicy"("serviceId", "currency", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CommissionAdjustment_reservationKey_createdAt_idx" ON "CommissionAdjustment"("reservationKey", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionAdjustment_nailArtistId_serviceType_month_idx" ON "CommissionAdjustment"("nailArtistId", "serviceType", "month");

-- AddForeignKey
ALTER TABLE "CommissionAdjustment" ADD CONSTRAINT "CommissionAdjustment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

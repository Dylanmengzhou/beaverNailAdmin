-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "settlementApprovedAt" TIMESTAMP(3),
ADD COLUMN     "settlementApprovedById" TEXT,
ADD COLUMN     "settlementVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProjectCommission" (
    "serviceId" TEXT NOT NULL,
    "rateBps" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCommission_pkey" PRIMARY KEY ("serviceId")
);

-- CreateTable
CREATE TABLE "SettlementRequest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "reservationKey" TEXT NOT NULL,
    "activeReservationId" TEXT,
    "nailArtistId" TEXT,
    "artistName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "baseVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "SettlementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRequest_activeReservationId_key" ON "SettlementRequest"("activeReservationId");

-- CreateIndex
CREATE INDEX "SettlementRequest_status_submittedAt_idx" ON "SettlementRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "SettlementRequest_nailArtistId_submittedAt_idx" ON "SettlementRequest"("nailArtistId", "submittedAt");

-- CreateIndex
CREATE INDEX "SettlementRequest_reservationKey_submittedAt_idx" ON "SettlementRequest"("reservationKey", "submittedAt");

-- AddForeignKey
ALTER TABLE "SettlementRequest" ADD CONSTRAINT "SettlementRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

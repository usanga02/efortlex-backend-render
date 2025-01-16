/*
  Warnings:

  - You are about to drop the `_ApartmentsToTenant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tenantRentPriceId` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "APARTMENT_BOOKINGS_STATUS" ADD VALUE 'CANCELED';
ALTER TYPE "APARTMENT_BOOKINGS_STATUS" ADD VALUE 'SUCCESSFUL';

-- DropForeignKey
ALTER TABLE "_ApartmentsToTenant" DROP CONSTRAINT "_ApartmentsToTenant_A_fkey";

-- DropForeignKey
ALTER TABLE "_ApartmentsToTenant" DROP CONSTRAINT "_ApartmentsToTenant_B_fkey";

-- DropIndex
DROP INDEX "tenants_userId_key";

-- AlterTable
ALTER TABLE "apartment_pricings" ADD COLUMN     "durationOfRent" "DURATION_OF_RENT" NOT NULL DEFAULT 'ANNUALLY';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "apartmentsId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "signedPolicies" TEXT[],
ADD COLUMN     "tenantRentPriceId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "_ApartmentsToTenant";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "tenantId" TEXT,
    "nextDue" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_rent_price" (
    "id" TEXT NOT NULL,
    "durationOfRent" "DURATION_OF_RENT" NOT NULL,
    "rent" DOUBLE PRECISION NOT NULL,
    "serviceCharge" DOUBLE PRECISION NOT NULL,
    "cautionFee" DOUBLE PRECISION NOT NULL,
    "agreementFee" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tenant_rent_price_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_tenantRentPriceId_fkey" FOREIGN KEY ("tenantRentPriceId") REFERENCES "tenant_rent_price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_apartmentsId_fkey" FOREIGN KEY ("apartmentsId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

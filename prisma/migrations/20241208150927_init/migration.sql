/*
  Warnings:

  - The values [BOOKED] on the enum `APARTMENT_BOOKINGS_STATUS` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `inspectionType` to the `apartment_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "INSPECTION_TYPE" AS ENUM ('physical_tour', 'virtual_tour', 'send_me_a_video');

-- AlterEnum
BEGIN;
CREATE TYPE "APARTMENT_BOOKINGS_STATUS_new" AS ENUM ('UNAVAILABLE', 'PENDING', 'SCHEDULED', 'CANCELED', 'SUCCESSFUL');
ALTER TABLE "apartment_bookings" ALTER COLUMN "status" TYPE "APARTMENT_BOOKINGS_STATUS_new" USING ("status"::text::"APARTMENT_BOOKINGS_STATUS_new");
ALTER TYPE "APARTMENT_BOOKINGS_STATUS" RENAME TO "APARTMENT_BOOKINGS_STATUS_old";
ALTER TYPE "APARTMENT_BOOKINGS_STATUS_new" RENAME TO "APARTMENT_BOOKINGS_STATUS";
DROP TYPE "APARTMENT_BOOKINGS_STATUS_old";
COMMIT;

-- AlterTable
ALTER TABLE "apartment_bookings" ADD COLUMN     "inspectionType" "INSPECTION_TYPE" NOT NULL;

-- AlterTable
ALTER TABLE "wishlists" ALTER COLUMN "apartmentIds" SET DEFAULT ARRAY[]::TEXT[];

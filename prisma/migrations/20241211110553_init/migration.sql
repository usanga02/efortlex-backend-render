/*
  Warnings:

  - Added the required column `landlordId` to the `maintenance_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `maintenance_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "landlordId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL;

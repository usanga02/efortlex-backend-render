/*
  Warnings:

  - Added the required column `apartmentId` to the `maintenance_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "apartmentId" TEXT NOT NULL;

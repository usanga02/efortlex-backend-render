/*
  Warnings:

  - Added the required column `apartmentId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "apartmentId" TEXT NOT NULL;

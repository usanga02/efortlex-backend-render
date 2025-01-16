/*
  Warnings:

  - You are about to drop the column `accountName` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `wallets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "accountName",
DROP COLUMN "accountNumber",
DROP COLUMN "bankName";

-- CreateTable
CREATE TABLE "bank_details" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletId" TEXT,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

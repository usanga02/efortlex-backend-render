/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

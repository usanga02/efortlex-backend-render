-- AlterTable
ALTER TABLE "withdrawal_histories" ADD COLUMN     "walletId" TEXT;

-- AddForeignKey
ALTER TABLE "withdrawal_histories" ADD CONSTRAINT "withdrawal_histories_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

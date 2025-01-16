/*
  Warnings:

  - Added the required column `amount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purpose` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "purpose" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

/*
  Warnings:

  - The values [SUCCESSFUL] on the enum `WITHDRAWAL_STATUS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WITHDRAWAL_STATUS_new" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
ALTER TABLE "withdrawal_histories" ALTER COLUMN "status" TYPE "WITHDRAWAL_STATUS_new" USING ("status"::text::"WITHDRAWAL_STATUS_new");
ALTER TYPE "WITHDRAWAL_STATUS" RENAME TO "WITHDRAWAL_STATUS_old";
ALTER TYPE "WITHDRAWAL_STATUS_new" RENAME TO "WITHDRAWAL_STATUS";
DROP TYPE "WITHDRAWAL_STATUS_old";
COMMIT;

/*
  Warnings:

  - You are about to drop the column `is_active` on the `channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "channels"."channel" DROP COLUMN "is_active";

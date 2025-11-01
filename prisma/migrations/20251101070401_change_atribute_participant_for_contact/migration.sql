/*
  Warnings:

  - You are about to drop the column `participant_id` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participant_meta` on the `conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participant_type` on the `conversation` table. All the data in the column will be lost.
  - Added the required column `contact_type` to the `conversation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "channels"."idx_conversation_participant";

-- AlterTable
ALTER TABLE "channels"."conversation" DROP COLUMN "participant_id",
DROP COLUMN "participant_meta",
DROP COLUMN "participant_type",
ADD COLUMN     "contact_id" TEXT,
ADD COLUMN     "contact_meta" JSONB,
ADD COLUMN     "contact_type" "channels"."ContactType" NOT NULL;

-- CreateIndex
CREATE INDEX "idx_conversation_contact" ON "channels"."conversation"("contact_id");

/*
  Warnings:

  - You are about to drop the column `conversation_id` on the `message_log` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `message_log` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `message_log` table. All the data in the column will be lost.
  - Added the required column `channel` to the `agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversationId` to the `message_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participant_type` to the `message_log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "channels"."ParticipantType" AS ENUM ('agent', 'client', 'lead', 'bot');

-- DropIndex
DROP INDEX "channels"."idx_message_entity_timestamp";

-- AlterTable
ALTER TABLE "channels"."agent" ADD COLUMN     "channel" "channels"."ChannelType" NOT NULL;

-- AlterTable
ALTER TABLE "channels"."message_log" DROP COLUMN "conversation_id",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "conversationId" INTEGER NOT NULL,
ADD COLUMN     "participant_id" INTEGER,
ADD COLUMN     "participant_type" "channels"."ParticipantType" NOT NULL;

-- CreateTable
CREATE TABLE "channels"."conversation" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "channel" "channels"."ChannelType" NOT NULL,
    "agentId" INTEGER,
    "client_id" INTEGER,
    "lead_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_conversation_company" ON "channels"."conversation"("company_id");

-- CreateIndex
CREATE INDEX "idx_conversation_channel" ON "channels"."conversation"("channel");

-- CreateIndex
CREATE INDEX "idx_message_conversation_ts" ON "channels"."message_log"("conversationId", "timestamp");

-- AddForeignKey
ALTER TABLE "channels"."message_log" ADD CONSTRAINT "message_log_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "channels"."conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "channels"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business"."client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business"."lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

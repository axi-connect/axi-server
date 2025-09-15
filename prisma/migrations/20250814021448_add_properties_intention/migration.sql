/*
  Warnings:

  - Added the required column `status` to the `agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversation_id` to the `message_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `intention` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `intention` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "channels"."AgentStatus" AS ENUM ('available', 'busy', 'away', 'offline', 'training', 'meeting', 'on_break');

-- CreateEnum
CREATE TYPE "parameters"."IntentionPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "parameters"."IntentionType" AS ENUM ('sales', 'support', 'technical', 'onboarding', 'follow_up');

-- AlterTable
ALTER TABLE "channels"."agent" ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "status" "channels"."AgentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "channels"."message_log" ADD COLUMN     "conversation_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "parameters"."intention" ADD COLUMN     "priority" "parameters"."IntentionPriority" NOT NULL,
ADD COLUMN     "type" "parameters"."IntentionType" NOT NULL;

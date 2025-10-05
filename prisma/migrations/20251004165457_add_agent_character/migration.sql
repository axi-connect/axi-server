/*
  Warnings:

  - You are about to drop the column `require_catalog` on the `agent_intention` table. All the data in the column will be lost.
  - You are about to drop the column `require_db` on the `agent_intention` table. All the data in the column will be lost.
  - You are about to drop the column `require_reminder` on the `agent_intention` table. All the data in the column will be lost.
  - You are about to drop the column `require_schedule` on the `agent_intention` table. All the data in the column will be lost.
  - You are about to drop the column `require_sheet` on the `agent_intention` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "channels"."agent" ADD COLUMN     "character_id" INTEGER;

-- AlterTable
ALTER TABLE "parameters"."agent_intention" DROP COLUMN "require_catalog",
DROP COLUMN "require_db",
DROP COLUMN "require_reminder",
DROP COLUMN "require_schedule",
DROP COLUMN "require_sheet",
ADD COLUMN     "requirements" JSONB;

-- CreateTable
CREATE TABLE "parameters"."agent_character" (
    "id" SERIAL NOT NULL,
    "avatar_url" TEXT,
    "style" JSONB,
    "voice" JSONB,
    "resources" JSONB,

    CONSTRAINT "agent_character_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "channels"."agent" ADD CONSTRAINT "agent_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "parameters"."agent_character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "channels"."channel" DROP CONSTRAINT "channel_credentials_id_fkey";

-- AlterTable
ALTER TABLE "channels"."channel" ALTER COLUMN "credentials_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "channels"."channel" ADD CONSTRAINT "channel_credentials_id_fkey" FOREIGN KEY ("credentials_id") REFERENCES "channels"."channel_credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

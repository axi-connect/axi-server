-- DropForeignKey
ALTER TABLE "parameters"."company_schedule" DROP CONSTRAINT "company_schedule_company_id_fkey";

-- AddForeignKey
ALTER TABLE "parameters"."company_schedule" ADD CONSTRAINT "company_schedule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- DropForeignKey
ALTER TABLE "business"."agenda" DROP CONSTRAINT "agenda_company_id_fkey";

-- DropForeignKey
ALTER TABLE "business"."catalog" DROP CONSTRAINT "catalog_company_id_fkey";

-- DropForeignKey
ALTER TABLE "business"."client" DROP CONSTRAINT "client_company_id_fkey";

-- DropForeignKey
ALTER TABLE "business"."product" DROP CONSTRAINT "product_catalog_id_fkey";

-- DropForeignKey
ALTER TABLE "business"."provider" DROP CONSTRAINT "provider_company_id_fkey";

-- DropForeignKey
ALTER TABLE "channels"."agent" DROP CONSTRAINT "agent_company_id_fkey";

-- DropForeignKey
ALTER TABLE "parameters"."agent_intention" DROP CONSTRAINT "agent_intention_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "parameters"."form" DROP CONSTRAINT "form_company_id_fkey";

-- AddForeignKey
ALTER TABLE "business"."catalog" ADD CONSTRAINT "catalog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."product" ADD CONSTRAINT "product_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "business"."catalog"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."agenda" ADD CONSTRAINT "agenda_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."client" ADD CONSTRAINT "client_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."provider" ADD CONSTRAINT "provider_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."agent" ADD CONSTRAINT "agent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parameters"."agent_intention" ADD CONSTRAINT "agent_intention_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "channels"."agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parameters"."form" ADD CONSTRAINT "form_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- DropForeignKey
ALTER TABLE "rbac"."role_module" DROP CONSTRAINT "role_module_role_id_fkey";

-- AddForeignKey
ALTER TABLE "rbac"."role_module" ADD CONSTRAINT "role_module_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac"."role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

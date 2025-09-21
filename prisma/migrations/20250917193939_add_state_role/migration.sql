-- CreateEnum
CREATE TYPE "rbac"."role_state" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "rbac"."role" ADD COLUMN     "state" "rbac"."role_state" NOT NULL DEFAULT 'active';

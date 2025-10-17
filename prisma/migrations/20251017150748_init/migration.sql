-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "business";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "channels";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "parameters";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rbac";

-- CreateEnum
CREATE TYPE "business"."DocumentType" AS ENUM ('cc', 'ce', 'ti', 'pp', 'nit');

-- CreateEnum
CREATE TYPE "business"."LeadStatus" AS ENUM ('Hot', 'Warm', 'Cold', 'New', 'Contacted', 'Converted');

-- CreateEnum
CREATE TYPE "channels"."ChannelProvider" AS ENUM ('META', 'TWILIO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "channels"."AgentStatus" AS ENUM ('available', 'busy', 'away', 'offline', 'training', 'meeting', 'on_break');

-- CreateEnum
CREATE TYPE "channels"."MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "channels"."ChannelType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'MESSENGER');

-- CreateEnum
CREATE TYPE "channels"."ParticipantType" AS ENUM ('agent', 'lead', 'client', 'prospect', 'customer', 'system');

-- CreateEnum
CREATE TYPE "channels"."MessageDirection" AS ENUM ('incoming', 'outgoing');

-- CreateEnum
CREATE TYPE "parameters"."type_field" AS ENUM ('string', 'number', 'date', 'email', 'select', 'boolean', 'location');

-- CreateEnum
CREATE TYPE "parameters"."days" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- CreateEnum
CREATE TYPE "parameters"."periodicity" AS ENUM ('once', 'daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "parameters"."channel" AS ENUM ('whatsapp', 'instagram', 'telegram', 'facebook', 'email');

-- CreateEnum
CREATE TYPE "parameters"."IntentionPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "parameters"."IntentionType" AS ENUM ('sales', 'support', 'technical', 'onboarding', 'follow_up');

-- CreateEnum
CREATE TYPE "rbac"."permission_type" AS ENUM ('read', 'create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "rbac"."role_state" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "business"."catalog" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."product" (
    "id" SERIAL NOT NULL,
    "price" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "catalog_id" INTEGER NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."agenda" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."client" (
    "id" SERIAL NOT NULL,
    "names" TEXT NOT NULL,
    "surnames" TEXT NOT NULL,
    "document_num" INTEGER,
    "document_type" "business"."DocumentType",
    "birthdate" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."lead" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "source" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "industry" TEXT,
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "status" "business"."LeadStatus" NOT NULL DEFAULT 'Cold',
    "pipeline_stage" TEXT NOT NULL DEFAULT 'Initial Contact',
    "opening_hours" JSONB,
    "reviews" JSONB,
    "notes" TEXT,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."agent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alive" BOOLEAN NOT NULL DEFAULT true,
    "channel" "channels"."ChannelType" NOT NULL,
    "client_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "character_id" INTEGER,
    "skills" TEXT[],
    "status" "channels"."AgentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."message_log" (
    "id" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "metadata" JSONB,
    "direction" "channels"."MessageDirection" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" TEXT NOT NULL,
    "status" "channels"."MessageStatus" NOT NULL DEFAULT 'PENDING',
    "content_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."conversation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "company_id" INTEGER NOT NULL,
    "channel_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "assigned_agent_id" INTEGER,
    "participant_id" TEXT,
    "participant_meta" JSONB,
    "participant_type" "channels"."ParticipantType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "channels"."ChannelType" NOT NULL,
    "config" JSONB,
    "provider" "channels"."ChannelProvider" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "credentials_id" TEXT NOT NULL,
    "provider_account" TEXT NOT NULL,
    "default_agent_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."message_attachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT,
    "local_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels"."channel_credential" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "provider" "channels"."ChannelProvider" NOT NULL,
    "credentials" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."company" (
    "id" SERIAL NOT NULL,
    "isotype" TEXT,
    "name" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "activity_description" TEXT NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."company_schedule" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "day" "parameters"."days" NOT NULL,
    "time_range" TEXT NOT NULL,

    CONSTRAINT "company_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."company_leads" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,

    CONSTRAINT "company_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."reminder" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER,
    "client_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "periodicity" "parameters"."periodicity" NOT NULL,
    "message" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel" "parameters"."channel" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "days" "parameters"."days"[],

    CONSTRAINT "reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."intention" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "flow_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ai_instructions" TEXT NOT NULL,
    "priority" "parameters"."IntentionPriority" NOT NULL,
    "type" "parameters"."IntentionType" NOT NULL,

    CONSTRAINT "intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."ai_requirement" (
    "id" SERIAL NOT NULL,
    "instructions" JSONB NOT NULL,

    CONSTRAINT "ai_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."agent_intention" (
    "id" SERIAL NOT NULL,
    "requirements" JSONB,
    "agent_id" INTEGER NOT NULL,
    "intention_id" INTEGER NOT NULL,
    "ai_requirement_id" INTEGER,

    CONSTRAINT "agent_intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."agent_character" (
    "id" SERIAL NOT NULL,
    "avatar_url" TEXT,
    "style" JSONB,
    "voice" JSONB,
    "resources" JSONB,

    CONSTRAINT "agent_character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."form" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,

    CONSTRAINT "form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters"."fields" (
    "id" SERIAL NOT NULL,
    "type" "parameters"."type_field" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "form_id" INTEGER NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."user" (
    "id" SERIAL NOT NULL,
    "avatar" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."module" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "code" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" INTEGER,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
    "state" "rbac"."role_state" NOT NULL DEFAULT 'active',

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."role_module" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "permission" "rbac"."permission_type"[] DEFAULT ARRAY['read', 'create']::"rbac"."permission_type"[],

    CONSTRAINT "role_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."session" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_code_key" ON "business"."catalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "client_document_num_key" ON "business"."client"("document_num");

-- CreateIndex
CREATE UNIQUE INDEX "client_email_key" ON "business"."client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "client_phone_key" ON "business"."client"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "lead_phone_key" ON "business"."lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "lead_email_key" ON "business"."lead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agent_phone_key" ON "channels"."agent"("phone");

-- CreateIndex
CREATE INDEX "idx_agent_phone" ON "channels"."agent"("phone");

-- CreateIndex
CREATE INDEX "idx_agent_status" ON "channels"."agent"("status");

-- CreateIndex
CREATE INDEX "idx_agent_skills" ON "channels"."agent"("skills");

-- CreateIndex
CREATE INDEX "idx_agent_channel" ON "channels"."agent"("channel");

-- CreateIndex
CREATE INDEX "idx_agent_company" ON "channels"."agent"("company_id");

-- CreateIndex
CREATE INDEX "idx_agent_character" ON "channels"."agent"("character_id");

-- CreateIndex
CREATE INDEX "idx_agent_company_channel" ON "channels"."agent"("company_id", "channel");

-- CreateIndex
CREATE INDEX "message_log_direction_status_idx" ON "channels"."message_log"("direction", "status");

-- CreateIndex
CREATE INDEX "idx_message_timestamp" ON "channels"."message_log"("timestamp");

-- CreateIndex
CREATE INDEX "idx_message_conversation_ts" ON "channels"."message_log"("conversation_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_external_id_key" ON "channels"."conversation"("external_id");

-- CreateIndex
CREATE INDEX "conversation_channel_id_external_id_idx" ON "channels"."conversation"("channel_id", "external_id");

-- CreateIndex
CREATE INDEX "idx_conversation_company" ON "channels"."conversation"("company_id");

-- CreateIndex
CREATE INDEX "idx_conversation_channel" ON "channels"."conversation"("channel_id");

-- CreateIndex
CREATE INDEX "idx_conversation_participant" ON "channels"."conversation"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_credentials_id_key" ON "channels"."channel"("credentials_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_provider_account_key" ON "channels"."channel"("provider_account");

-- CreateIndex
CREATE INDEX "channel_company_id_type_idx" ON "channels"."channel"("company_id", "type");

-- CreateIndex
CREATE INDEX "channel_provider_provider_account_idx" ON "channels"."channel"("provider", "provider_account");

-- CreateIndex
CREATE INDEX "message_attachment_message_id_idx" ON "channels"."message_attachment"("message_id");

-- CreateIndex
CREATE INDEX "channel_credential_channel_id_idx" ON "channels"."channel_credential"("channel_id");

-- CreateIndex
CREATE INDEX "channel_credential_provider_idx" ON "channels"."channel_credential"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "company_nit_key" ON "rbac"."company"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "company_leads_companyId_leadId_key" ON "business"."company_leads"("companyId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "form_code_key" ON "parameters"."form"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "rbac"."user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "rbac"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "module_code_key" ON "rbac"."module"("code");

-- CreateIndex
CREATE UNIQUE INDEX "module_path_key" ON "rbac"."module"("path");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "rbac"."role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_module_role_id_module_id_key" ON "rbac"."role_module"("role_id", "module_id");

-- AddForeignKey
ALTER TABLE "business"."catalog" ADD CONSTRAINT "catalog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."product" ADD CONSTRAINT "product_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "business"."catalog"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."agenda" ADD CONSTRAINT "agenda_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."agenda" ADD CONSTRAINT "agenda_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business"."client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."agenda" ADD CONSTRAINT "agenda_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."client" ADD CONSTRAINT "client_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."provider" ADD CONSTRAINT "provider_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."agent" ADD CONSTRAINT "agent_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "parameters"."agent_character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."agent" ADD CONSTRAINT "agent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."message_log" ADD CONSTRAINT "message_log_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "channels"."conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "channels"."agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"."channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."conversation" ADD CONSTRAINT "conversation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "channels"."channel" ADD CONSTRAINT "channel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."channel" ADD CONSTRAINT "channel_credentials_id_fkey" FOREIGN KEY ("credentials_id") REFERENCES "channels"."channel_credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels"."message_attachment" ADD CONSTRAINT "message_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "channels"."message_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."company_schedule" ADD CONSTRAINT "company_schedule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business"."company_leads" ADD CONSTRAINT "company_leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "rbac"."company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."company_leads" ADD CONSTRAINT "company_leads_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "business"."lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."reminder" ADD CONSTRAINT "reminder_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business"."lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."reminder" ADD CONSTRAINT "reminder_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business"."client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."reminder" ADD CONSTRAINT "reminder_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."agent_intention" ADD CONSTRAINT "agent_intention_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "channels"."agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parameters"."agent_intention" ADD CONSTRAINT "agent_intention_intention_id_fkey" FOREIGN KEY ("intention_id") REFERENCES "parameters"."intention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."agent_intention" ADD CONSTRAINT "agent_intention_ai_requirement_id_fkey" FOREIGN KEY ("ai_requirement_id") REFERENCES "parameters"."ai_requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters"."form" ADD CONSTRAINT "form_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parameters"."fields" ADD CONSTRAINT "fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "parameters"."form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac"."user" ADD CONSTRAINT "user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "rbac"."company"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac"."role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."module" ADD CONSTRAINT "module_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "rbac"."module"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."role_module" ADD CONSTRAINT "role_module_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "rbac"."module"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."role_module" ADD CONSTRAINT "role_module_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac"."role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "rbac"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rbac"."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "rbac"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

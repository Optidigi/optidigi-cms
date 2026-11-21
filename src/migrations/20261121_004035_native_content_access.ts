import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assistant_credentials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_credentials_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_assistant_credentials_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_assistant_credentials_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_delete_receipts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_delete_receipts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_assistant_delete_receipts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_assistant_delete_receipts_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_threads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_threads_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_messages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_uploads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_uploads_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "assistant_credentials" CASCADE;
  DROP TABLE "assistant_credentials_rels" CASCADE;
  DROP TABLE "_assistant_credentials_v" CASCADE;
  DROP TABLE "_assistant_credentials_v_rels" CASCADE;
  DROP TABLE "assistant_delete_receipts" CASCADE;
  DROP TABLE "assistant_delete_receipts_rels" CASCADE;
  DROP TABLE "_assistant_delete_receipts_v" CASCADE;
  DROP TABLE "_assistant_delete_receipts_v_rels" CASCADE;
  DROP TABLE "assistant_threads" CASCADE;
  DROP TABLE "assistant_threads_rels" CASCADE;
  DROP TABLE "assistant_messages" CASCADE;
  DROP TABLE "assistant_messages_rels" CASCADE;
  DROP TABLE "assistant_uploads" CASCADE;
  DROP TABLE "assistant_uploads_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_assistant_credentials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_assistant_delete_receipts_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_assistant_credentials_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_assistant_delete_receipts__idx";
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assistant_credentials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assistant_delete_receipts_id";
  DROP TYPE "public"."enum_assistant_credentials_provider";
  DROP TYPE "public"."enum__assistant_credentials_v_version_provider";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_assistant_credentials_provider" AS ENUM('anthropic', 'openai', 'openai-compatible');
  CREATE TYPE "public"."enum__assistant_credentials_v_version_provider" AS ENUM('anthropic', 'openai', 'openai-compatible');
  CREATE TABLE "assistant_credentials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant" numeric NOT NULL,
  	"provider" "enum_assistant_credentials_provider" NOT NULL,
  	"model" varchar NOT NULL,
  	"base_u_r_l" varchar,
  	"catalog" jsonb,
  	"ciphertext" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assistant_credentials_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_assistant_credentials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant" numeric NOT NULL,
  	"version_provider" "enum__assistant_credentials_v_version_provider" NOT NULL,
  	"version_model" varchar NOT NULL,
  	"version_base_u_r_l" varchar,
  	"version_catalog" jsonb,
  	"version_ciphertext" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_assistant_credentials_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "assistant_delete_receipts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nonce" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assistant_delete_receipts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_assistant_delete_receipts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_nonce" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_assistant_delete_receipts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "assistant_threads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer,
  	"tenant_id" integer,
  	"title" varchar NOT NULL,
  	"archived" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assistant_threads_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "assistant_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"thread_id" integer NOT NULL,
  	"message_id" varchar NOT NULL,
  	"message" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assistant_messages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "assistant_uploads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer,
  	"tenant_id" integer,
  	"thread_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"_stored" boolean,
  	"_transforms" jsonb,
  	"original_filename" varchar,
  	"original_url" varchar,
  	"original_mime_type" varchar,
  	"original_filesize" numeric,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_prefix" varchar,
  	"original__objectkey" varchar,
  	"original__stored" boolean,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "assistant_uploads_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  DROP INDEX "pages_slug_idx";
  DROP INDEX "_pages_v_version_version_slug_idx";
  DROP INDEX "articles_slug_idx";
  DROP INDEX "_articles_v_version_version_slug_idx";
  DROP INDEX "projects_slug_idx";
  DROP INDEX "_projects_v_version_version_slug_idx";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assistant_credentials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assistant_delete_receipts_id" integer;
  ALTER TABLE "assistant_credentials_rels" ADD CONSTRAINT "assistant_credentials_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_credentials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_credentials_rels" ADD CONSTRAINT "assistant_credentials_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_assistant_credentials_v" ADD CONSTRAINT "_assistant_credentials_v_parent_id_assistant_credentials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_credentials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_assistant_credentials_v_rels" ADD CONSTRAINT "_assistant_credentials_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_assistant_credentials_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_assistant_credentials_v_rels" ADD CONSTRAINT "_assistant_credentials_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_delete_receipts_rels" ADD CONSTRAINT "assistant_delete_receipts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_delete_receipts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_delete_receipts_rels" ADD CONSTRAINT "assistant_delete_receipts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_assistant_delete_receipts_v" ADD CONSTRAINT "_assistant_delete_receipts_v_parent_id_assistant_delete_receipts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_delete_receipts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_assistant_delete_receipts_v_rels" ADD CONSTRAINT "_assistant_delete_receipts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_assistant_delete_receipts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_assistant_delete_receipts_v_rels" ADD CONSTRAINT "_assistant_delete_receipts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_threads_rels" ADD CONSTRAINT "assistant_threads_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_threads_rels" ADD CONSTRAINT "assistant_threads_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_messages_rels" ADD CONSTRAINT "assistant_messages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_messages_rels" ADD CONSTRAINT "assistant_messages_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_uploads" ADD CONSTRAINT "assistant_uploads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_uploads" ADD CONSTRAINT "assistant_uploads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_uploads" ADD CONSTRAINT "assistant_uploads_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_uploads_rels" ADD CONSTRAINT "assistant_uploads_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_uploads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_uploads_rels" ADD CONSTRAINT "assistant_uploads_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "assistant_credentials_tenant_idx" ON "assistant_credentials" USING btree ("tenant");
  CREATE INDEX "assistant_credentials_updated_at_idx" ON "assistant_credentials" USING btree ("updated_at");
  CREATE INDEX "assistant_credentials_created_at_idx" ON "assistant_credentials" USING btree ("created_at");
  CREATE INDEX "assistant_credentials_rels_order_idx" ON "assistant_credentials_rels" USING btree ("order");
  CREATE INDEX "assistant_credentials_rels_parent_idx" ON "assistant_credentials_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_credentials_rels_path_idx" ON "assistant_credentials_rels" USING btree ("path");
  CREATE INDEX "assistant_credentials_rels_users_id_idx" ON "assistant_credentials_rels" USING btree ("users_id");
  CREATE INDEX "_assistant_credentials_v_parent_idx" ON "_assistant_credentials_v" USING btree ("parent_id");
  CREATE INDEX "_assistant_credentials_v_version_version_tenant_idx" ON "_assistant_credentials_v" USING btree ("version_tenant");
  CREATE INDEX "_assistant_credentials_v_version_version_updated_at_idx" ON "_assistant_credentials_v" USING btree ("version_updated_at");
  CREATE INDEX "_assistant_credentials_v_version_version_created_at_idx" ON "_assistant_credentials_v" USING btree ("version_created_at");
  CREATE INDEX "_assistant_credentials_v_created_at_idx" ON "_assistant_credentials_v" USING btree ("created_at");
  CREATE INDEX "_assistant_credentials_v_updated_at_idx" ON "_assistant_credentials_v" USING btree ("updated_at");
  CREATE INDEX "_assistant_credentials_v_rels_order_idx" ON "_assistant_credentials_v_rels" USING btree ("order");
  CREATE INDEX "_assistant_credentials_v_rels_parent_idx" ON "_assistant_credentials_v_rels" USING btree ("parent_id");
  CREATE INDEX "_assistant_credentials_v_rels_path_idx" ON "_assistant_credentials_v_rels" USING btree ("path");
  CREATE INDEX "_assistant_credentials_v_rels_users_id_idx" ON "_assistant_credentials_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "assistant_delete_receipts_nonce_idx" ON "assistant_delete_receipts" USING btree ("nonce");
  CREATE INDEX "assistant_delete_receipts_updated_at_idx" ON "assistant_delete_receipts" USING btree ("updated_at");
  CREATE INDEX "assistant_delete_receipts_created_at_idx" ON "assistant_delete_receipts" USING btree ("created_at");
  CREATE INDEX "assistant_delete_receipts_rels_order_idx" ON "assistant_delete_receipts_rels" USING btree ("order");
  CREATE INDEX "assistant_delete_receipts_rels_parent_idx" ON "assistant_delete_receipts_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_delete_receipts_rels_path_idx" ON "assistant_delete_receipts_rels" USING btree ("path");
  CREATE INDEX "assistant_delete_receipts_rels_users_id_idx" ON "assistant_delete_receipts_rels" USING btree ("users_id");
  CREATE INDEX "_assistant_delete_receipts_v_parent_idx" ON "_assistant_delete_receipts_v" USING btree ("parent_id");
  CREATE INDEX "_assistant_delete_receipts_v_version_version_nonce_idx" ON "_assistant_delete_receipts_v" USING btree ("version_nonce");
  CREATE INDEX "_assistant_delete_receipts_v_version_version_updated_at_idx" ON "_assistant_delete_receipts_v" USING btree ("version_updated_at");
  CREATE INDEX "_assistant_delete_receipts_v_version_version_created_at_idx" ON "_assistant_delete_receipts_v" USING btree ("version_created_at");
  CREATE INDEX "_assistant_delete_receipts_v_created_at_idx" ON "_assistant_delete_receipts_v" USING btree ("created_at");
  CREATE INDEX "_assistant_delete_receipts_v_updated_at_idx" ON "_assistant_delete_receipts_v" USING btree ("updated_at");
  CREATE INDEX "_assistant_delete_receipts_v_rels_order_idx" ON "_assistant_delete_receipts_v_rels" USING btree ("order");
  CREATE INDEX "_assistant_delete_receipts_v_rels_parent_idx" ON "_assistant_delete_receipts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_assistant_delete_receipts_v_rels_path_idx" ON "_assistant_delete_receipts_v_rels" USING btree ("path");
  CREATE INDEX "_assistant_delete_receipts_v_rels_users_id_idx" ON "_assistant_delete_receipts_v_rels" USING btree ("users_id");
  CREATE INDEX "assistant_threads_owner_idx" ON "assistant_threads" USING btree ("owner_id");
  CREATE INDEX "assistant_threads_tenant_idx" ON "assistant_threads" USING btree ("tenant_id");
  CREATE INDEX "assistant_threads_updated_at_idx" ON "assistant_threads" USING btree ("updated_at");
  CREATE INDEX "assistant_threads_created_at_idx" ON "assistant_threads" USING btree ("created_at");
  CREATE INDEX "owner_tenant_archived_updatedAt_idx" ON "assistant_threads" USING btree ("owner_id","tenant_id","archived","updated_at");
  CREATE INDEX "assistant_threads_rels_order_idx" ON "assistant_threads_rels" USING btree ("order");
  CREATE INDEX "assistant_threads_rels_parent_idx" ON "assistant_threads_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_threads_rels_path_idx" ON "assistant_threads_rels" USING btree ("path");
  CREATE INDEX "assistant_threads_rels_users_id_idx" ON "assistant_threads_rels" USING btree ("users_id");
  CREATE INDEX "assistant_messages_thread_idx" ON "assistant_messages" USING btree ("thread_id");
  CREATE INDEX "assistant_messages_updated_at_idx" ON "assistant_messages" USING btree ("updated_at");
  CREATE INDEX "assistant_messages_created_at_idx" ON "assistant_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "thread_messageId_idx" ON "assistant_messages" USING btree ("thread_id","message_id");
  CREATE INDEX "assistant_messages_rels_order_idx" ON "assistant_messages_rels" USING btree ("order");
  CREATE INDEX "assistant_messages_rels_parent_idx" ON "assistant_messages_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_messages_rels_path_idx" ON "assistant_messages_rels" USING btree ("path");
  CREATE INDEX "assistant_messages_rels_users_id_idx" ON "assistant_messages_rels" USING btree ("users_id");
  CREATE INDEX "assistant_uploads_owner_idx" ON "assistant_uploads" USING btree ("owner_id");
  CREATE INDEX "assistant_uploads_tenant_idx" ON "assistant_uploads" USING btree ("tenant_id");
  CREATE INDEX "assistant_uploads_thread_idx" ON "assistant_uploads" USING btree ("thread_id");
  CREATE INDEX "assistant_uploads_updated_at_idx" ON "assistant_uploads" USING btree ("updated_at");
  CREATE INDEX "assistant_uploads_created_at_idx" ON "assistant_uploads" USING btree ("created_at");
  CREATE UNIQUE INDEX "assistant_uploads_filename_idx" ON "assistant_uploads" USING btree ("filename");
  CREATE INDEX "assistant_uploads_original_original_filename_idx" ON "assistant_uploads" USING btree ("original_filename");
  CREATE INDEX "assistant_uploads_rels_order_idx" ON "assistant_uploads_rels" USING btree ("order");
  CREATE INDEX "assistant_uploads_rels_parent_idx" ON "assistant_uploads_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_uploads_rels_path_idx" ON "assistant_uploads_rels" USING btree ("path");
  CREATE INDEX "assistant_uploads_rels_users_id_idx" ON "assistant_uploads_rels" USING btree ("users_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assistant_credentials_fk" FOREIGN KEY ("assistant_credentials_id") REFERENCES "public"."assistant_credentials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assistant_delete_receipts_fk" FOREIGN KEY ("assistant_delete_receipts_id") REFERENCES "public"."assistant_delete_receipts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_assistant_credentials_id_idx" ON "payload_locked_documents_rels" USING btree ("assistant_credentials_id");
  CREATE INDEX "payload_locked_documents_rels_assistant_delete_receipts__idx" ON "payload_locked_documents_rels" USING btree ("assistant_delete_receipts_id");`)
}

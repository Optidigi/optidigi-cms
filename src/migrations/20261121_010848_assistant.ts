import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_assistant_settings_provider" AS ENUM('anthropic', 'openai', 'openai-compatible');
  CREATE TABLE "assistant_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"provider" "enum_assistant_settings_provider" DEFAULT 'anthropic' NOT NULL,
  	"base_u_r_l" varchar,
  	"api_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assistant_settings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "assistant_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "assistant_threads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"archived" boolean DEFAULT false,
  	"messages" jsonb,
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
  
  CREATE TABLE "assistant_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
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
  
  CREATE TABLE "assistant_files_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assistant_settings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assistant_threads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assistant_files_id" integer;
  ALTER TABLE "assistant_settings" ADD CONSTRAINT "assistant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_settings_texts" ADD CONSTRAINT "assistant_settings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_settings_rels" ADD CONSTRAINT "assistant_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_settings_rels" ADD CONSTRAINT "assistant_settings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_threads" ADD CONSTRAINT "assistant_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_threads_rels" ADD CONSTRAINT "assistant_threads_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_threads_rels" ADD CONSTRAINT "assistant_threads_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_files" ADD CONSTRAINT "assistant_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assistant_files_rels" ADD CONSTRAINT "assistant_files_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assistant_files_rels" ADD CONSTRAINT "assistant_files_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "assistant_settings_tenant_idx" ON "assistant_settings" USING btree ("tenant_id");
  CREATE INDEX "assistant_settings_updated_at_idx" ON "assistant_settings" USING btree ("updated_at");
  CREATE INDEX "assistant_settings_created_at_idx" ON "assistant_settings" USING btree ("created_at");
  CREATE INDEX "assistant_settings_texts_order_parent" ON "assistant_settings_texts" USING btree ("order","parent_id");
  CREATE INDEX "assistant_settings_rels_order_idx" ON "assistant_settings_rels" USING btree ("order");
  CREATE INDEX "assistant_settings_rels_parent_idx" ON "assistant_settings_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_settings_rels_path_idx" ON "assistant_settings_rels" USING btree ("path");
  CREATE INDEX "assistant_settings_rels_users_id_idx" ON "assistant_settings_rels" USING btree ("users_id");
  CREATE INDEX "assistant_threads_tenant_idx" ON "assistant_threads" USING btree ("tenant_id");
  CREATE INDEX "assistant_threads_archived_idx" ON "assistant_threads" USING btree ("archived");
  CREATE INDEX "assistant_threads_updated_at_idx" ON "assistant_threads" USING btree ("updated_at");
  CREATE INDEX "assistant_threads_created_at_idx" ON "assistant_threads" USING btree ("created_at");
  CREATE INDEX "assistant_threads_rels_order_idx" ON "assistant_threads_rels" USING btree ("order");
  CREATE INDEX "assistant_threads_rels_parent_idx" ON "assistant_threads_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_threads_rels_path_idx" ON "assistant_threads_rels" USING btree ("path");
  CREATE INDEX "assistant_threads_rels_users_id_idx" ON "assistant_threads_rels" USING btree ("users_id");
  CREATE INDEX "assistant_files_tenant_idx" ON "assistant_files" USING btree ("tenant_id");
  CREATE INDEX "assistant_files_updated_at_idx" ON "assistant_files" USING btree ("updated_at");
  CREATE INDEX "assistant_files_created_at_idx" ON "assistant_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "assistant_files_filename_idx" ON "assistant_files" USING btree ("filename");
  CREATE INDEX "assistant_files_original_original_filename_idx" ON "assistant_files" USING btree ("original_filename");
  CREATE INDEX "assistant_files_rels_order_idx" ON "assistant_files_rels" USING btree ("order");
  CREATE INDEX "assistant_files_rels_parent_idx" ON "assistant_files_rels" USING btree ("parent_id");
  CREATE INDEX "assistant_files_rels_path_idx" ON "assistant_files_rels" USING btree ("path");
  CREATE INDEX "assistant_files_rels_users_id_idx" ON "assistant_files_rels" USING btree ("users_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assistant_settings_fk" FOREIGN KEY ("assistant_settings_id") REFERENCES "public"."assistant_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assistant_threads_fk" FOREIGN KEY ("assistant_threads_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assistant_files_fk" FOREIGN KEY ("assistant_files_id") REFERENCES "public"."assistant_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_assistant_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("assistant_settings_id");
  CREATE INDEX "payload_locked_documents_rels_assistant_threads_id_idx" ON "payload_locked_documents_rels" USING btree ("assistant_threads_id");
  CREATE INDEX "payload_locked_documents_rels_assistant_files_id_idx" ON "payload_locked_documents_rels" USING btree ("assistant_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assistant_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_settings_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_settings_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_threads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_threads_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assistant_files_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "assistant_settings" CASCADE;
  DROP TABLE "assistant_settings_texts" CASCADE;
  DROP TABLE "assistant_settings_rels" CASCADE;
  DROP TABLE "assistant_threads" CASCADE;
  DROP TABLE "assistant_threads_rels" CASCADE;
  DROP TABLE "assistant_files" CASCADE;
  DROP TABLE "assistant_files_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assistant_settings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assistant_threads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assistant_files_fk";
  
  DROP INDEX "payload_locked_documents_rels_assistant_settings_id_idx";
  DROP INDEX "payload_locked_documents_rels_assistant_threads_id_idx";
  DROP INDEX "payload_locked_documents_rels_assistant_files_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assistant_settings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assistant_threads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assistant_files_id";
  DROP TYPE "public"."enum_assistant_settings_provider";`)
}

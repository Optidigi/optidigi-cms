import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  CREATE INDEX "assistant_uploads_rels_users_id_idx" ON "assistant_uploads_rels" USING btree ("users_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "assistant_threads" CASCADE;
  DROP TABLE "assistant_threads_rels" CASCADE;
  DROP TABLE "assistant_messages" CASCADE;
  DROP TABLE "assistant_messages_rels" CASCADE;
  DROP TABLE "assistant_uploads" CASCADE;
  DROP TABLE "assistant_uploads_rels" CASCADE;`)
}

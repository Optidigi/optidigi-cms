import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "platform" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_website_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "platform_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_platform_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_brand_website_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_platform_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "platform" ADD CONSTRAINT "platform_brand_website_id_tenants_id_fk" FOREIGN KEY ("brand_website_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "platform_rels" ADD CONSTRAINT "platform_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_rels" ADD CONSTRAINT "platform_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_platform_v" ADD CONSTRAINT "_platform_v_version_brand_website_id_tenants_id_fk" FOREIGN KEY ("version_brand_website_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_platform_v_rels" ADD CONSTRAINT "_platform_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_platform_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_platform_v_rels" ADD CONSTRAINT "_platform_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "platform_brand_website_idx" ON "platform" USING btree ("brand_website_id");
  CREATE INDEX "platform_rels_order_idx" ON "platform_rels" USING btree ("order");
  CREATE INDEX "platform_rels_parent_idx" ON "platform_rels" USING btree ("parent_id");
  CREATE INDEX "platform_rels_path_idx" ON "platform_rels" USING btree ("path");
  CREATE INDEX "platform_rels_users_id_idx" ON "platform_rels" USING btree ("users_id");
  CREATE INDEX "_platform_v_version_version_brand_website_idx" ON "_platform_v" USING btree ("version_brand_website_id");
  CREATE INDEX "_platform_v_created_at_idx" ON "_platform_v" USING btree ("created_at");
  CREATE INDEX "_platform_v_updated_at_idx" ON "_platform_v" USING btree ("updated_at");
  CREATE INDEX "_platform_v_rels_order_idx" ON "_platform_v_rels" USING btree ("order");
  CREATE INDEX "_platform_v_rels_parent_idx" ON "_platform_v_rels" USING btree ("parent_id");
  CREATE INDEX "_platform_v_rels_path_idx" ON "_platform_v_rels" USING btree ("path");
  CREATE INDEX "_platform_v_rels_users_id_idx" ON "_platform_v_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "platform" CASCADE;
  DROP TABLE "platform_rels" CASCADE;
  DROP TABLE "_platform_v" CASCADE;
  DROP TABLE "_platform_v_rels" CASCADE;`)
}

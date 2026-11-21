import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_sections" AS ENUM('articles', 'projects');
  CREATE TYPE "public"."enum__tenants_v_version_sections" AS ENUM('articles', 'projects');
  CREATE TABLE "tenants_sections" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tenants_sections",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_tenants_v_version_sections" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__tenants_v_version_sections",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "tenants_sections" ADD CONSTRAINT "tenants_sections_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tenants_v_version_sections" ADD CONSTRAINT "_tenants_v_version_sections_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tenants_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tenants_sections_order_idx" ON "tenants_sections" USING btree ("order");
  CREATE INDEX "tenants_sections_parent_idx" ON "tenants_sections" USING btree ("parent_id");
  CREATE INDEX "_tenants_v_version_sections_order_idx" ON "_tenants_v_version_sections" USING btree ("order");
  CREATE INDEX "_tenants_v_version_sections_parent_idx" ON "_tenants_v_version_sections" USING btree ("parent_id");
  -- Websites that already have articles or portfolio projects keep those sections switched on.
  INSERT INTO "tenants_sections" ("order", "parent_id", "value")
    SELECT 1, t."id", 'articles' FROM "tenants" t WHERE EXISTS (SELECT 1 FROM "articles" a WHERE a."tenant_id" = t."id");
  INSERT INTO "tenants_sections" ("order", "parent_id", "value")
    SELECT 2, t."id", 'projects' FROM "tenants" t WHERE EXISTS (SELECT 1 FROM "projects" p WHERE p."tenant_id" = t."id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "tenants_sections" CASCADE;
  DROP TABLE "_tenants_v_version_sections" CASCADE;
  DROP TYPE "public"."enum_tenants_sections";
  DROP TYPE "public"."enum__tenants_v_version_sections";`)
}

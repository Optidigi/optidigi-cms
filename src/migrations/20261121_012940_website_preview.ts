import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" ADD COLUMN "preview_paths_pages" varchar;
  ALTER TABLE "tenants" ADD COLUMN "preview_paths_articles" varchar;
  ALTER TABLE "tenants" ADD COLUMN "preview_paths_projects" varchar;
  ALTER TABLE "tenants" ADD COLUMN "refresh_url" varchar;
  ALTER TABLE "tenants" ADD COLUMN "refresh_secret" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_preview_paths_pages" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_preview_paths_articles" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_preview_paths_projects" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_refresh_url" varchar;
  ALTER TABLE "_tenants_v" ADD COLUMN "version_refresh_secret" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "preview_paths_pages";
  ALTER TABLE "tenants" DROP COLUMN "preview_paths_articles";
  ALTER TABLE "tenants" DROP COLUMN "preview_paths_projects";
  ALTER TABLE "tenants" DROP COLUMN "refresh_url";
  ALTER TABLE "tenants" DROP COLUMN "refresh_secret";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_preview_paths_pages";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_preview_paths_articles";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_preview_paths_projects";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_refresh_url";
  ALTER TABLE "_tenants_v" DROP COLUMN "version_refresh_secret";`)
}

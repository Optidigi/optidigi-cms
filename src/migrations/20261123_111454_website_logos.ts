import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "logo_dark_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "icon_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_logo_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_logo_dark_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_icon_id" integer;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_dark_id_media_id_fk" FOREIGN KEY ("version_logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_icon_id_media_id_fk" FOREIGN KEY ("version_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_logo_dark_idx" ON "site_settings" USING btree ("logo_dark_id");
  CREATE INDEX "site_settings_icon_idx" ON "site_settings" USING btree ("icon_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version_logo_dark_idx" ON "_site_settings_v" USING btree ("version_logo_dark_id");
  CREATE INDEX "_site_settings_v_version_version_icon_idx" ON "_site_settings_v" USING btree ("version_icon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_dark_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_icon_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_logo_dark_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_icon_id_media_id_fk";
  
  DROP INDEX "site_settings_logo_idx";
  DROP INDEX "site_settings_logo_dark_idx";
  DROP INDEX "site_settings_icon_idx";
  DROP INDEX "_site_settings_v_version_version_logo_idx";
  DROP INDEX "_site_settings_v_version_version_logo_dark_idx";
  DROP INDEX "_site_settings_v_version_version_icon_idx";
  ALTER TABLE "site_settings" DROP COLUMN "logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "logo_dark_id";
  ALTER TABLE "site_settings" DROP COLUMN "icon_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_logo_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_logo_dark_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_icon_id";`)
}

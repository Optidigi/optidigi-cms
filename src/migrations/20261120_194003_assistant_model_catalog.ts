import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assistant_credentials" ADD COLUMN "catalog" jsonb;
  ALTER TABLE "_assistant_credentials_v" ADD COLUMN "version_catalog" jsonb;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assistant_credentials" DROP COLUMN "catalog";
  ALTER TABLE "_assistant_credentials_v" DROP COLUMN "version_catalog";`)
}

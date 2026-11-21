import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

type OldSettings = { id: number; provider: string; base_u_r_l: string | null; api_key: string | null }

const providerNames: Record<string, string> = { anthropic: 'Anthropic', openai: 'OpenAI', 'openai-compatible': 'OpenAI-compatible' }

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Keep each website's single connection: read it before the old columns are dropped.
  const { rows: old } = await db.execute(sql`SELECT "id", "provider", "base_u_r_l", "api_key" FROM "assistant_settings"`)
  const { rows: oldModels } = await db.execute(
    sql`SELECT "parent_id", "text" FROM "assistant_settings_texts" WHERE "path" = 'models' ORDER BY "parent_id", "order"`,
  )

  await db.execute(sql`
   CREATE TYPE "public"."enum_assistant_settings_connections_provider" AS ENUM('anthropic', 'openai', 'google', 'mistral', 'gateway', 'openai-compatible');
  CREATE TABLE "assistant_settings_connections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"provider" "enum_assistant_settings_connections_provider" DEFAULT 'anthropic' NOT NULL,
  	"base_u_r_l" varchar,
  	"api_key" varchar,
  	"has_key" boolean DEFAULT false
  );
  
  ALTER TABLE "assistant_settings" ADD COLUMN "default_model" varchar;
  ALTER TABLE "assistant_settings_connections" ADD CONSTRAINT "assistant_settings_connections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."assistant_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "assistant_settings_connections_order_idx" ON "assistant_settings_connections" USING btree ("_order");
  CREATE INDEX "assistant_settings_connections_parent_id_idx" ON "assistant_settings_connections" USING btree ("_parent_id");
  ALTER TABLE "assistant_settings" DROP COLUMN "provider";
  ALTER TABLE "assistant_settings" DROP COLUMN "base_u_r_l";
  ALTER TABLE "assistant_settings" DROP COLUMN "api_key";
  DROP TYPE "public"."enum_assistant_settings_provider";
  DELETE FROM "assistant_settings_texts" WHERE "path" = 'models';`)

  for (const settings of old as OldSettings[]) {
    const models = (oldModels as { parent_id: number; text: string }[]).filter((row) => row.parent_id === settings.id).map((row) => row.text)
    await payload.update({
      collection: 'assistant-settings',
      id: settings.id,
      depth: 0,
      overrideAccess: true,
      req,
      data: {
        connections: [
          {
            label: providerNames[settings.provider] ?? settings.provider,
            provider: settings.provider as 'anthropic',
            baseURL: settings.base_u_r_l,
            // The field hook encrypts the plain key again.
            apiKey: settings.api_key ? payload.decrypt(settings.api_key) : null,
            models,
          },
        ],
      },
    })
  }

  // Older admin builds could save the same preference twice at once; keep the newest row per user and key.
  await db.execute(sql`
  DELETE FROM "payload_preferences" WHERE "id" IN (
    SELECT p."id" FROM "payload_preferences" p
    JOIN "payload_preferences_rels" r ON r."parent_id" = p."id" AND r."path" = 'user'
    WHERE EXISTS (
      SELECT 1 FROM "payload_preferences" p2
      JOIN "payload_preferences_rels" r2 ON r2."parent_id" = p2."id" AND r2."path" = 'user'
      WHERE p2."key" = p."key" AND r2."users_id" = r."users_id"
        AND (p2."updated_at" > p."updated_at" OR (p2."updated_at" = p."updated_at" AND p2."id" > p."id"))
    )
  );`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_assistant_settings_provider" AS ENUM('anthropic', 'openai', 'openai-compatible');
  DROP TABLE "assistant_settings_connections" CASCADE;
  ALTER TABLE "assistant_settings" ADD COLUMN "provider" "enum_assistant_settings_provider" DEFAULT 'anthropic' NOT NULL;
  ALTER TABLE "assistant_settings" ADD COLUMN "base_u_r_l" varchar;
  ALTER TABLE "assistant_settings" ADD COLUMN "api_key" varchar;
  ALTER TABLE "assistant_settings" DROP COLUMN "default_model";
  DROP TYPE "public"."enum_assistant_settings_connections_provider";`)
}

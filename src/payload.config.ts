import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { nl } from '@payloadcms/translations/languages/nl'
import { sharpTransformer } from '@payloadcms/transformer-sharp'
import path from 'node:path'
import { buildConfig, type CollectionConfig } from 'payload'
import { fileURLToPath } from 'node:url'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { isPlatformAdmin, platformOnly } from './site/access'
import { bootstrapOperator } from './site/bootstrap'
import { collectionLabels } from './site/collection-labels'
import { Articles, Pages, Projects, SiteSettings, Tenants } from './site/content'
import { siteEndpoints } from './site/endpoints'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const origin = process.env.PUBLIC_SERVER_URL
const content = [Pages, Articles, Projects, SiteSettings, Media]

function withCollectionLabels(collection: CollectionConfig): CollectionConfig {
  if (!Object.hasOwn(collectionLabels, collection.slug)) return collection
  return {
    ...collection,
    labels: collectionLabels[collection.slug as keyof typeof collectionLabels],
    admin: {
      ...collection.admin,
      ...((collection.slug === 'tenants' || collection.slug === 'users') && {
        hidden: ({ user }) => !isPlatformAdmin(user),
      }),
    },
  }
}

const noTools = {
  count: false, countVersions: false, create: false, delete: false, duplicate: false,
  find: false, findDistinct: false, findVersionByID: false, findVersions: false,
  getCollectionSchema: false, getUploadInstructions: false, restoreVersion: false, update: false,
} as const

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
  },
  cli: { commands: { 'bootstrap-operator': bootstrapOperator } },
  collections: [Users, Tenants, ...content].map(withCollectionLabels),
  csrf: origin ? [origin] : [],
  editor: lexicalEditor(),
  // Sends password-reset email when SMTP is configured; otherwise Payload logs email to the console.
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM_ADDRESS ?? '',
        defaultFromName: process.env.SMTP_FROM_NAME ?? 'Optidigi CMS',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
        },
      })
    : undefined,
  endpoints: siteEndpoints,
  llmInstructions: { access: platformOnly },
  secret: process.env.PAYLOAD_SECRET ?? '',
  serverURL: origin ?? '',
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    push: false,
  }),
  i18n: {
    supportedLanguages: { nl, en },
    fallbackLanguage: 'nl',
    translations: {
      nl: { general: { locale: 'Documentvertaling' } },
      en: { general: { locale: 'Document translation' } },
    },
  },
  localization: {
    locales: [{ code: 'nl', label: 'Nederlands' }, { code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'nl',
  },
  plugins: [
    multiTenantPlugin({
      cleanupAfterTenantDelete: false,
      i18n: { translations: { en: { 'nav-tenantSelector-label': 'Active website' }, nl: { 'nav-tenantSelector-label': 'Actieve website' } } },
      collections: {
        pages: {},
        articles: {},
        projects: {},
        'site-settings': { isGlobal: true },
        media: {},
      },
      tenantField: { access: { update: platformOnly } },
      tenantsArrayField: {
        rowFields: [{
          name: 'role', type: 'select', required: true, defaultValue: 'editor',
          options: ['admin', 'editor'],
        }],
      },
      userHasAccessToAllTenants: isPlatformAdmin,
    }),
    mcpPlugin({
      access: ({ req }) => Boolean(req.user),
      collections: {
        ...Object.fromEntries(content.map(({ slug }) => [
          slug, { tools: { delete: false, duplicate: false, restoreVersion: false } },
        ])),
        users: { tools: noTools },
        tenants: { tools: noTools },
      },
    }),
  ],
  upload: {
    limits: { fileSize: 8 * 1024 * 1024 },
    abortOnLimit: true,
    transformers: [sharpTransformer()],
  },
})

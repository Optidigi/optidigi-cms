import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { sharpTransformer } from '@payloadcms/transformer-sharp'
import path from 'node:path'
import { APIError, buildConfig, type CollectionConfig } from 'payload'
import { fileURLToPath } from 'node:url'
import { AssistantCredentials, AssistantDeleteReceipts } from './assistant/credentials'
import { assistantEndpoints } from './assistant/endpoints'
import { getAssistantTenantScope } from './assistant/scope'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { andFilter, isPlatformAdmin, platformOnly, relationID } from './site/access'
import { bootstrapOperator } from './site/bootstrap'
import { Articles, Pages, Projects, SiteSettings, Tenants } from './site/content'
import { siteEndpoints } from './site/endpoints'
import { checkSitePage } from './site/tools'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const origin = process.env.PUBLIC_SERVER_URL
const content = [Pages, Articles, Projects, SiteSettings, Media]

const tenantAccess: NonNullable<
  NonNullable<Parameters<typeof multiTenantPlugin>[0]['collections']['pages']>['accessResultOverride']
> = ({ accessKey, accessResult, req }) => {
  const tenant = getAssistantTenantScope(req)
  if (!accessResult || tenant === undefined || accessKey === 'create') return accessResult
  const field = accessKey === 'readVersions' ? 'version.tenant' : 'tenant'
  return andFilter(accessResult, { [field]: { equals: tenant } })
}

function enforceAssistantWrites(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeValidate: [
        ({ data, operation, req }) => {
          const tenant = getAssistantTenantScope(req)
          if (!data || tenant === undefined) return data
          if (data.tenant != null && relationID(data.tenant) !== tenant) {
            throw new APIError('The document must stay in the active tenant.', 403)
          }
          return operation === 'create' ? { ...data, tenant } : data
        },
        ...(collection.hooks?.beforeValidate ?? []),
      ],
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
    components: {
      afterNavLinks: ['/assistant/Nav#AssistantNav'],
      views: {
        assistant: { Component: '/assistant/View#AssistantView', path: '/assistant', exact: true },
      },
    },
  },
  cli: { commands: { 'bootstrap-operator': bootstrapOperator } },
  collections: [Users, Tenants, ...content.map(enforceAssistantWrites), AssistantCredentials, AssistantDeleteReceipts],
  csrf: origin ? [origin] : [],
  editor: lexicalEditor(),
  endpoints: [...siteEndpoints, ...assistantEndpoints],
  llmInstructions: { access: platformOnly },
  secret: process.env.PAYLOAD_SECRET ?? '',
  serverURL: origin ?? '',
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    push: false,
  }),
  localization: { locales: ['nl', 'en'], fallback: true, defaultLocale: 'nl' },
  plugins: [
    multiTenantPlugin({
      cleanupAfterTenantDelete: false,
      collections: {
        pages: { accessResultOverride: tenantAccess },
        articles: { accessResultOverride: tenantAccess },
        projects: { accessResultOverride: tenantAccess },
        'site-settings': { accessResultOverride: tenantAccess, isGlobal: true },
        media: { accessResultOverride: tenantAccess },
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
        'assistant-credentials': { tools: noTools },
        'assistant-delete-receipts': { tools: noTools },
      },
      tools: { checkSitePage },
    }),
  ],
  upload: {
    limits: { fileSize: 8 * 1024 * 1024 },
    abortOnLimit: true,
    transformers: [sharpTransformer()],
  },
})

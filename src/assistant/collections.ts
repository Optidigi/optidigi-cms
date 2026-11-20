import path from 'node:path'
import { APIError, type Access, type CollectionConfig } from 'payload'
import { relationID, tenantIDs } from '../site/access'

export const assistantUploadTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
] as const
export const assistantUploadLimit = 4 * 1024 * 1024
export const assistantUploadDir = path.resolve(process.env.UPLOADS_DIR ?? 'media', 'assistant')

const deny = () => false
const privateAccess = { create: deny, read: deny, update: deny, delete: deny }

export const AssistantThreads: CollectionConfig = {
  slug: 'assistant-threads',
  admin: { hidden: true },
  versions: false,
  lockDocuments: false,
  access: privateAccess,
  indexes: [{ fields: ['owner', 'tenant', 'archived', 'updatedAt'] }],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
    { name: 'title', type: 'text', required: true, maxLength: 120 },
    { name: 'archived', type: 'checkbox', defaultValue: false },
  ],
}

export const AssistantMessages: CollectionConfig = {
  slug: 'assistant-messages',
  admin: { hidden: true },
  versions: false,
  lockDocuments: false,
  access: privateAccess,
  indexes: [{ fields: ['thread', 'messageId'], unique: true }],
  fields: [
    { name: 'thread', type: 'relationship', relationTo: 'assistant-threads', required: true },
    { name: 'messageId', type: 'text', required: true, maxLength: 128 },
    { name: 'message', type: 'json', required: true },
  ],
}

const readUploads: Access = ({ req }) => {
  const tenants = tenantIDs(req.user)
  if (req.user?.collection !== 'users' || !tenants.length) return false
  return {
    owner: { equals: req.user.id },
    tenant: { in: tenants },
    thread: { exists: true },
  }
}

export const AssistantUploads: CollectionConfig = {
  slug: 'assistant-uploads',
  admin: { hidden: true },
  versions: false,
  lockDocuments: false,
  access: {
    ...privateAccess,
    create: ({ req }) => {
      const origin = process.env.PUBLIC_SERVER_URL || req.payload.config.serverURL
      return (
        req.user?.collection === 'users' && Boolean(origin) && req.headers.get('origin') === origin
      )
    },
    read: readUploads,
  },
  upload: {
    staticDir: assistantUploadDir,
    mimeTypes: [...assistantUploadTypes],
    pasteURL: false,
    skipSafeFetch: false,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants' },
    { name: 'thread', type: 'relationship', relationTo: 'assistant-threads', required: true },
  ],
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if (operation !== 'create') return args

        const { req } = args
        const owner = req.user?.collection === 'users' ? relationID(req.user.id) : undefined
        const thread = relationID(args.data?.thread)
        if (!owner || !thread) throw new APIError('Select one of your active conversations.', 403)
        const file = req.file
        if (!file?.size || file.size > assistantUploadLimit) {
          throw new APIError('Attachments must be between 1 byte and 4 MiB.', 400)
        }

        const {
          docs: [record],
        } = await req.payload.find({
          collection: 'assistant-threads',
          where: {
            id: { equals: thread },
            owner: { equals: owner },
            tenant: { in: tenantIDs(req.user) },
            archived: { not_equals: true },
          },
          limit: 1,
          depth: 0,
          req,
          overrideAccess: true,
        })
        const tenant = relationID(record?.tenant)
        if (!tenant) throw new APIError('Conversation not found.', 404)
        const { totalDocs } = await req.payload.count({
          collection: 'assistant-uploads',
          where: { thread: { equals: thread } },
          req,
          overrideAccess: true,
        })
        if (totalDocs >= 60)
          throw new APIError('This conversation already has 60 attachments.', 409)
        return { ...args, data: { ...args.data, owner, tenant, thread } }
      },
    ],
  },
}

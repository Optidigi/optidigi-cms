import path from 'node:path'
import type { Access, CollectionConfig, FieldHook } from 'payload'
import { platformOnly, signedIn } from '../site/access'

export const assistantProviders = ['anthropic', 'openai', 'openai-compatible'] as const

// Chats and chat files belong to the user who created them (Payload's createdBy authorship field).
const own: Access = ({ req }) =>
  req.user?.collection === 'users' ? { 'createdBy.value': { equals: req.user.id } } : false

const encryptKey: FieldHook = ({ value, originalDoc, req }) => {
  if (typeof value !== 'string' || !value) return originalDoc?.apiKey
  return value.startsWith('v1:') ? value : req.payload.encrypt(value)
}

// One per website (the multi-tenant plugin treats it as a per-tenant global).
export const AssistantSettings: CollectionConfig = {
  slug: 'assistant-settings',
  labels: {
    singular: { en: 'Assistant settings', nl: 'Assistentinstellingen' },
    plural: { en: 'Assistant settings', nl: 'Assistentinstellingen' },
  },
  access: { create: platformOnly, delete: platformOnly, read: signedIn, update: platformOnly },
  // No version history: it would keep extra copies of the encrypted key.
  versions: false,
  fields: [
    { name: 'provider', type: 'select', required: true, defaultValue: 'anthropic', options: [...assistantProviders] },
    { name: 'baseURL', type: 'text' },
    {
      name: 'apiKey',
      type: 'text',
      // Encrypted with Payload's own key ring and never returned by the API.
      access: { read: () => false },
      hooks: { beforeChange: [encryptKey] },
    },
    { name: 'models', type: 'text', hasMany: true, required: true, minRows: 1 },
  ],
}

export const AssistantThreads: CollectionConfig = {
  slug: 'assistant-threads',
  labels: {
    singular: { en: 'Assistant chat', nl: 'Assistentgesprek' },
    plural: { en: 'Assistant chats', nl: 'Assistentgesprekken' },
  },
  admin: { useAsTitle: 'title' },
  access: { create: signedIn, delete: own, read: own, update: own },
  // Every reply rewrites the conversation; version history would copy it each time.
  versions: false,
  fields: [
    { name: 'title', type: 'text' },
    { name: 'archived', type: 'checkbox', defaultValue: false, index: true },
    { name: 'messages', type: 'json' },
  ],
}

export const AssistantFiles: CollectionConfig = {
  slug: 'assistant-files',
  labels: {
    singular: { en: 'Assistant file', nl: 'Assistentbestand' },
    plural: { en: 'Assistant files', nl: 'Assistentbestanden' },
  },
  access: { create: signedIn, delete: own, read: own, update: () => false },
  versions: false,
  fields: [],
  upload: {
    staticDir: path.join(process.env.UPLOADS_DIR ?? path.resolve('media'), 'assistant'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pasteURL: false,
  },
}

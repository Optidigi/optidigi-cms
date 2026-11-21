import path from 'node:path'
import type { Access, CollectionConfig, FieldHook } from 'payload'
import { platformOnly, signedIn } from '../site/access'

export const assistantProviders = ['anthropic', 'openai', 'google', 'mistral', 'gateway', 'openai-compatible'] as const
export type AssistantProvider = (typeof assistantProviders)[number]

// Chats and chat files belong to the user who created them (Payload's createdBy authorship field).
const own: Access = ({ req }) =>
  req.user?.collection === 'users' ? { 'createdBy.value': { equals: req.user.id } } : false

// The key is never readable through the API, so a new value from a request is always plain text.
// An unchanged or missing value keeps the stored ciphertext of the same connection (Payload matches
// array rows by id); null clears the key. `hasKey` tells readers whether a key is stored.
const encryptKey: FieldHook = ({ value, previousValue, siblingData, req }) => {
  const stored = typeof previousValue === 'string' && previousValue ? previousValue : null
  const next =
    value === null ? null : typeof value !== 'string' || !value || value === stored ? stored : req.payload.encrypt(value)
  siblingData.hasKey = Boolean(next)
  return next
}

// One per website (the multi-tenant plugin treats it as a per-tenant global). Members of the website
// can read the connections; only platform administrators change them, and nobody reads a key.
export const AssistantSettings: CollectionConfig = {
  slug: 'assistant-settings',
  labels: {
    singular: { en: 'AI settings', nl: 'AI-instellingen' },
    plural: { en: 'AI settings', nl: 'AI-instellingen' },
  },
  access: { create: platformOnly, delete: platformOnly, read: signedIn, update: platformOnly },
  // No version history: it would keep extra copies of the encrypted keys.
  versions: false,
  fields: [
    {
      name: 'connections',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'provider', type: 'select', required: true, defaultValue: 'anthropic', options: [...assistantProviders] },
        // Required for OpenAI-compatible endpoints (OpenRouter, self-hosted); optional proxy for the others.
        {
          name: 'baseURL',
          type: 'text',
          // It can carry a proxy token, so only platform administrators read it.
          access: { read: platformOnly },
          validate: (value: unknown, { siblingData }: { siblingData: { provider?: string } }) => {
            if (value && !/^https?:\/\/\S+$/.test(String(value))) return 'Use an http(s) URL.'
            return siblingData?.provider === 'openai-compatible' && !value ? 'An OpenAI-compatible connection needs a base URL.' : true
          },
        },
        {
          name: 'apiKey',
          type: 'text',
          // Encrypted with Payload's own key ring and never returned by the API.
          access: { read: () => false },
          hooks: { beforeChange: [encryptKey] },
        },
        { name: 'hasKey', type: 'checkbox', defaultValue: false },
        // The model IDs this connection offers in the chat.
        { name: 'models', type: 'text', hasMany: true },
      ],
    },
    // `connectionID:modelID`; the first enabled model is used when it's empty or no longer enabled.
    { name: 'defaultModel', type: 'text' },
  ],
}

export const AssistantThreads: CollectionConfig = {
  slug: 'assistant-threads',
  labels: {
    singular: { en: 'AI chat', nl: 'AI-gesprek' },
    plural: { en: 'AI chats', nl: 'AI-gesprekken' },
  },
  admin: { useAsTitle: 'title' },
  access: { create: signedIn, delete: own, read: own, update: own },
  // Every reply rewrites the conversation; version history would copy it each time.
  versions: false,
  fields: [
    { name: 'title', type: 'text' },
    { name: 'archived', type: 'checkbox', defaultValue: false, index: true },
    // Written only by the assistant endpoint after its checks, never directly through the API.
    { name: 'messages', type: 'json', access: { update: () => false } },
  ],
  hooks: {
    // Remove the chat's uploaded images with the chat.
    afterDelete: [
      async ({ doc, req }) => {
        const urls = JSON.stringify(doc.messages ?? '').match(/\/api\/assistant-files\/file\/[^"\\]+/g) ?? []
        const filenames = [...new Set(urls.map((url) => decodeURIComponent(url.split('/').pop()!)))]
        if (filenames.length) {
          await req.payload.delete({
            collection: 'assistant-files', overrideAccess: false, req, where: { filename: { in: filenames } },
          })
        }
      },
    ],
  },
}

export const AssistantFiles: CollectionConfig = {
  slug: 'assistant-files',
  labels: {
    singular: { en: 'AI chat file', nl: 'AI-chatbestand' },
    plural: { en: 'AI chat files', nl: 'AI-chatbestanden' },
  },
  // Chat images are never edited; uploads are replaced instead.
  access: { create: signedIn, delete: own, read: own, update: () => false },
  versions: false,
  fields: [],
  upload: {
    staticDir: path.join(process.env.UPLOADS_DIR ?? path.resolve('media'), 'assistant'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pasteURL: false,
  },
}

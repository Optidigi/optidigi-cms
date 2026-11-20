import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { CollectionConfig } from 'payload'
import { modelProviders } from './protocol'

const privateAccess = {
  create: () => false,
  read: () => false,
  update: () => false,
  delete: () => false,
}

export const AssistantCredentials: CollectionConfig = {
  slug: 'assistant-credentials',
  admin: { hidden: true },
  access: privateAccess,
  fields: [
    { name: 'tenant', type: 'number', required: true, unique: true },
    { name: 'provider', type: 'select', options: [...modelProviders], required: true },
    { name: 'model', type: 'text', required: true },
    { name: 'baseURL', type: 'text' },
    { name: 'catalog', type: 'json' },
    { name: 'ciphertext', type: 'text', required: true, access: { read: () => false } },
  ],
}

export const AssistantDeleteReceipts: CollectionConfig = {
  slug: 'assistant-delete-receipts',
  admin: { hidden: true },
  access: privateAccess,
  fields: [{ name: 'nonce', type: 'text', required: true, unique: true }],
}

async function encryptionKey() {
  const path = process.env.ASSISTANT_KEY_FILE
  if (!path) throw new Error('Assistant encryption is unavailable.')
  const value = (await readFile(path, 'utf8')).trim()
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('Invalid assistant encryption key.')
  return Buffer.from(value, 'hex')
}

export async function encryptCredential(value: string, tenant: number) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', await encryptionKey(), iv)
  cipher.setAAD(Buffer.from(`optidigi-assistant:v1:${tenant}`))
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export async function decryptCredential(value: string, tenant: number) {
  const [version, iv, tag, ciphertext] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !ciphertext)
    throw new Error('Invalid assistant ciphertext.')
  const decipher = createDecipheriv(
    'aes-256-gcm',
    await encryptionKey(),
    Buffer.from(iv, 'base64url'),
  )
  decipher.setAAD(Buffer.from(`optidigi-assistant:v1:${tenant}`))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

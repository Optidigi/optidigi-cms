import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { signedIn, tenantDelete } from '../site/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: signedIn,
    delete: tenantDelete,
    read: signedIn,
    update: signedIn,
  },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: {
    staticDir: process.env.UPLOADS_DIR ?? path.resolve('media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    pasteURL: false,
  },
}

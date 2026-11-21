import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { anyone, signedIn, tenantDelete } from '../site/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: signedIn,
    delete: tenantDelete,
    // Website images are public, as in Payload's website template.
    read: anyone,
    update: signedIn,
  },
  fields: [{ name: 'alt', label: { en: 'Alternative text', nl: 'Alternatieve tekst' }, type: 'text', required: true }],
  upload: {
    staticDir: process.env.UPLOADS_DIR ?? path.resolve('media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    pasteURL: false,
  },
}

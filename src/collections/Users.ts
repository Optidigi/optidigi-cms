import type { CollectionConfig } from 'payload'
import { isPlatformAdmin, platformOnly } from '../site/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: {
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: platformOnly,
    delete: platformOnly,
    read: ({ req }) =>
      isPlatformAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) =>
      isPlatformAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      options: ['customer', 'platform-admin'],
      access: { create: platformOnly, update: platformOnly },
    },
  ],
}

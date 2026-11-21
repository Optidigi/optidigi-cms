import { Forbidden, type CollectionConfig } from 'payload'
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
  hooks: {
    beforeValidate: [
      // Security guard: Payload's /api/users/first-register creates a user with access checks bypassed
      // whenever the table is empty. Only the bootstrap-operator command may create the first user.
      ({ operation, req }) => {
        if (operation === 'create' && !isPlatformAdmin(req.user) && !req.context.bootstrapUser) {
          throw new Forbidden(req.t)
        }
      },
    ],
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

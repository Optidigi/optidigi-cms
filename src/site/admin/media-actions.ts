import { z } from 'zod'
import type { PayloadRequest } from 'payload'
import { canAccessSite } from './access'

const schema = z.object({
  site: z.string().regex(/^\d+$/),
  id: z.coerce.number().int().positive(),
  revision: z.string().min(1),
})

export async function deleteMedia(req: PayloadRequest, form: FormData) {
  const input = schema.safeParse(Object.fromEntries(form))
  if (!input.success) return false
  const { site, id, revision } = input.data
  const tenant = canAccessSite(req, site)
  if (!tenant) return false
  try {
    const {
      docs: [media],
    } = await req.payload.find({
      collection: 'media',
      req,
      overrideAccess: false,
      depth: 0,
      limit: 1,
      where: { id: { equals: id }, tenant: { equals: tenant } },
    })
    if (media?.updatedAt !== revision) return false
    await req.payload.delete({
      collection: 'media',
      id,
      req,
      overrideAccess: false,
      overrideLock: false,
    })
  } catch {
    return false
  }
  return true
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminRoot, currentSite } from './data'

const schema = z.object({
  site: z.string().regex(/^\d+$/),
  id: z.coerce.number().int().positive(),
  revision: z.string().min(1),
})

export async function deleteMedia(form: FormData) {
  const input = schema.safeParse(Object.fromEntries(form))
  if (!input.success) return false
  const { site, id, revision } = input.data
  const { req, selected } = await currentSite(site)
  try {
    const {
      docs: [media],
    } = await req.payload.find({
      collection: 'media',
      req,
      overrideAccess: false,
      depth: 0,
      limit: 1,
      where: { id: { equals: id }, tenant: { equals: selected.id } },
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
  revalidatePath(adminRoot + '/' + selected.id + '/media')
  return true
}

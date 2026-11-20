import { type PayloadRequest } from 'payload'
import { isPlatformAdmin, relationID, tenantIDs } from '../access'
import type { EditorialSection } from './contracts'

export function canAccessSite(req: PayloadRequest, site: unknown) {
  const id = relationID(site)
  return id && req.user?.collection === 'users' &&
    (isPlatformAdmin(req.user) || tenantIDs(req.user).includes(id)) ? id : undefined
}

export async function findEditorialDocument(
  req: PayloadRequest, site: number, locale: 'nl' | 'en', collection: EditorialSection, id?: number,
) {
  const { docs: [doc] } = await req.payload.find({
    collection, req, overrideAccess: false, depth: 0, locale, draft: true, fallbackLocale: false,
    limit: 1, where: { tenant: { equals: site }, ...(id ? { id: { equals: id } } : {}) },
  })
  return doc
}

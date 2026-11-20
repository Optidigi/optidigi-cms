import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createPayloadRequest, getPayload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { isPlatformAdmin, tenantIDs } from '../site/access'
import type { SiteLocale } from '../site/preview'

export const studioRequest = cache(async () => {
  const payload = await getPayload({ config })
  const requestHeaders = new Headers(await headers())
  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user || user.collection !== 'users') redirect('/studio/login')
  return createPayloadRequest({ payload, user, req: { headers: requestHeaders } })
})

export async function listSites(req: PayloadRequest) {
  const all = isPlatformAdmin(req.user)
  const ids = tenantIDs(req.user)
  if (!all && !ids.length) return []
  const { docs } = await req.payload.find({
    collection: 'tenants',
    req,
    overrideAccess: false,
    depth: 0,
    pagination: false,
    sort: 'name',
    select: { name: true, siteOrigin: true },
    where: all ? undefined : { id: { in: ids } },
  })
  return docs
}

export async function getHomepage(req: PayloadRequest, siteID: number, locale: SiteLocale) {
  if (!isPlatformAdmin(req.user) && !tenantIDs(req.user).includes(siteID)) return null
  const {
    docs: [page],
  } = await req.payload.find({
    collection: 'pages',
    req,
    overrideAccess: false,
    draft: true,
    fallbackLocale: false,
    depth: 0,
    locale,
    limit: 1,
    where: { tenant: { equals: siteID }, slug: { equals: 'home' } },
    select: { heading: true, description: true, updatedAt: true, _status: true },
  })
  return page ?? null
}

import config from '@payload-config'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createPayloadRequest, getPayload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { isPlatformAdmin, relationID, tenantIDs } from '@/site/access'

export const adminRoot = '/admin-shadcn'
export const editorialSections = {
  pages: 'Pagina’s',
  'site-settings': 'Website-instellingen',
} as const
export type EditorialSection = keyof typeof editorialSections

export const comparisonRequest = cache(async () => {
  const requestHeaders = new Headers(await headers())
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  if (user?.collection !== 'users') redirect('/admin/login?redirect=' + adminRoot)
  return createPayloadRequest({ payload, user, req: { headers: requestHeaders } })
})

export const comparisonSites = cache(async (req: PayloadRequest) => {
  const ids = tenantIDs(req.user)
  const all = isPlatformAdmin(req.user)
  if (!all && !ids.length) return []
  return (
    await req.payload.find({
      collection: 'tenants',
      req,
      overrideAccess: false,
      depth: 0,
      pagination: false,
      sort: 'name',
      select: { name: true, siteOrigin: true },
      where: all ? undefined : { id: { in: ids } },
    })
  ).docs
})

export const currentSite = cache(async (site: string) => {
  const req = await comparisonRequest()
  const sites = await comparisonSites(req)
  const selected = sites.find(({ id }) => id === relationID(site))
  if (!selected) notFound()
  return { req, sites, selected }
})

export async function findHomepage(req: PayloadRequest, site: number, locale: 'nl' | 'en') {
  const {
    docs: [home],
  } = await req.payload.find({
    collection: 'pages',
    req,
    overrideAccess: false,
    depth: 0,
    locale,
    draft: true,
    fallbackLocale: false,
    limit: 1,
    where: { tenant: { equals: site }, slug: { equals: 'home' } },
    select: {
      slug: true,
      title: true,
      heading: true,
      description: true,
      seo: true,
      _status: true,
      updatedAt: true,
    },
  })
  return home
}

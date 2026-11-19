import type { PayloadRequest } from 'payload'
import { isPlatformAdmin, relationID, tenantIDs } from '../site/access'

export async function loadWorkspace(req: PayloadRequest, selectedTenant: unknown) {
  const memberships = tenantIDs(req.user)
  const selection = relationID(selectedTenant)
  const tenantID =
    selection && (isPlatformAdmin(req.user) || memberships.includes(selection))
      ? selection
      : memberships.length === 1
        ? memberships[0]
        : undefined

  if (!req.user || tenantID === undefined) return null

  const payload = req.payload
  const tenant = await payload.findByID({
    collection: 'tenants',
    id: tenantID,
    depth: 0,
    overrideAccess: false,
    disableErrors: true,
    req,
    select: { name: true, siteOrigin: true },
  })
  if (!tenant) return null

  const tenantWhere = { tenant: { equals: tenantID } }
  const [home, settings, ...drafts] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { ...tenantWhere, slug: { equals: 'home' } },
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req,
      select: { slug: true },
    }),
    payload.find({
      collection: 'site-settings',
      where: tenantWhere,
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req,
      select: { name: true },
    }),
    ...(['pages', 'articles', 'projects'] as const).map(async (collection) => {
      const result = await payload.find({
        collection,
        where: { ...tenantWhere, _status: { equals: 'draft' } },
        draft: true,
        limit: 5,
        sort: '-updatedAt',
        depth: 0,
        overrideAccess: false,
        req,
        select: { title: true, updatedAt: true },
      })
      return result.docs.map(({ id, title, updatedAt }) => ({ id, title, updatedAt, collection }))
    }),
  ])

  return {
    tenant,
    homepageID: home.docs[0]?.id,
    settingsID: settings.docs[0]?.id,
    drafts: drafts
      .flat()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
  }
}

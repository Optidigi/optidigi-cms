import type { Endpoint, Where } from 'payload'
import { authorizePreview, siteLocale } from './preview'

const noStore = { 'Cache-Control': 'no-store' }

export const siteEndpoints: Endpoint[] = [
  {
    path: '/health',
    method: 'get',
    disableAuth: true,
    handler: async (req) => {
      try {
        await req.payload.count({ collection: 'tenants', overrideAccess: true })
        return Response.json({ ok: true }, { headers: noStore })
      } catch {
        return Response.json({ ok: false }, { status: 503, headers: noStore })
      }
    },
  },
  {
    path: '/site-content',
    method: 'get',
    disableAuth: true,
    handler: async (req) => {
      const query = new URL(req.url!).searchParams
      const tenantSlug = query.get('tenant')
      const locale = siteLocale(query.get('locale') ?? 'nl')
      const draft = query.get('draft') === 'true'
      if (!locale || !tenantSlug || !/^[a-z\d-]{1,80}$/.test(tenantSlug)) {
        return Response.json({ error: 'Invalid site or locale.' }, { status: 400, headers: noStore })
      }

      const { docs: [tenant] } = await req.payload.find({
        collection: 'tenants', where: { slug: { equals: tenantSlug } }, limit: 1,
        depth: 0, overrideAccess: true,
      })
      if (!tenant) return Response.json({ error: 'Site not found.' }, { status: 404, headers: noStore })

      const actor = draft ? await authorizePreview(req, tenant.id, locale) : undefined
      if (draft && !actor) {
        return Response.json({ error: 'Invalid or expired preview.' }, { status: 401, headers: noStore })
      }

      const tenantWhere: Where = draft
        ? { tenant: { equals: tenant.id } }
        : { tenant: { equals: tenant.id }, _status: { equals: 'published' } }
      const options = {
        depth: 0 as const, draft, locale, limit: 1, overrideAccess: !draft, user: actor,
      }

      const [{ docs: [settings] }, { docs: [page] }] = await Promise.all([
        req.payload.find({
          ...options, collection: 'site-settings', where: tenantWhere,
          select: { name: true, seo: true },
        }),
        req.payload.find({
          ...options, collection: 'pages',
          where: { ...tenantWhere, slug: { equals: 'home' } },
          select: { heading: true, description: true },
        }),
      ])

      return Response.json({
        siteSettings: { name: settings?.name, title: settings?.seo?.title, description: settings?.seo?.description },
        homepage: { heading: page?.heading, description: page?.description },
      }, { headers: noStore })
    },
  },
]

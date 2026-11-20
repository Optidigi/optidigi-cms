import type { Endpoint, PayloadRequest } from 'payload'
import { isPlatformAdmin, relationID } from '../access'
import { previewURL, siteLocale } from '../preview'
import { canAccessSite, findEditorialDocument } from './access'
import { saveEditorial } from './actions'
import { saveAccount, savePlatform } from './admin-actions'
import { deleteMedia } from './media-actions'

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function mutation(
  path: string,
  run: (req: PayloadRequest, form: FormData) => Promise<unknown>,
): Endpoint {
  return {
    path: '/cms-admin/' + path,
    method: 'post',
    async handler(req) {
      if (req.user?.collection !== 'users') return json({ error: 'Unauthorized' }, 401)
      const form = await req.formData?.()
      if (!form) return json({ error: 'Invalid form' }, 400)
      return json(await run(req, form))
    },
  }
}

export const adminEndpoints: Endpoint[] = [
  mutation('editorial', saveEditorial),
  mutation('account', saveAccount),
  mutation('platform', savePlatform),
  mutation('media/delete', deleteMedia),
  {
    path: '/cms-admin/site-members',
    method: 'get',
    async handler(req) {
      const query = new URL(req.url!).searchParams
      const site = canAccessSite(req, query.get('site'))
      if (
        !site ||
        (!isPlatformAdmin(req.user) &&
          !req.user?.tenants?.some(
            ({ tenant, role }) => relationID(tenant) === site && role === 'admin',
          ))
      ) {
        return json({ error: 'Website membership is unavailable.' }, 403)
      }
      const page = Math.min(10000, relationID(query.get('page')) ?? 1)
      const result = await req.payload.find({
        collection: 'users',
        req,
        overrideAccess: true,
        depth: 0,
        limit: 30,
        page,
        sort: 'email',
        select: { email: true, tenants: true },
        where: { 'tenants.tenant': { equals: site } },
      })
      return json({
        members: result.docs.flatMap(({ id, email, tenants }) => {
          const membership = tenants?.find(({ tenant }) => relationID(tenant) === site)
          return membership ? [{ id, email, role: membership.role }] : []
        }),
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      })
    },
  },
  {
    path: '/cms-admin/preview',
    method: 'get',
    async handler(req) {
      const query = new URL(req.url!).searchParams
      const site = canAccessSite(req, query.get('site'))
      const collection = query.get('collection')
      const id = relationID(query.get('id'))
      const locale = siteLocale(query.get('locale'))
      if (!site || !id || !locale || (collection !== 'pages' && collection !== 'site-settings')) {
        return json({ url: null }, 404)
      }
      const doc = await findEditorialDocument(req, site, locale, collection, id)
      return json({ url: doc ? await previewURL(collection, id, locale, req) : null })
    },
  },
]

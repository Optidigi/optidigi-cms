import { notFound, redirect } from 'next/navigation'
import type { PaginatedDocs, Where } from 'payload'
import { cache } from 'react'
import type { Config, User } from '@/payload-types'
import { isPlatformAdmin, relationID, tenantIDs } from '@/site/access'
import { type EditorialSection } from '@/site/admin/contracts'
import { adminHTTP } from './http'

export { editorialSections, type EditorialSection } from '@/site/admin/contracts'
export const adminRoot = '/admin'

type Collections = Config['collections']
type Query = {
  where?: Where
  select?: Record<string, boolean>
  depth?: number
  sort?: string
  page?: number
  limit?: number
  pagination?: boolean
  draft?: boolean
  locale?: string
  fallbackLocale?: false
}

function queryString({ where, select, fallbackLocale, ...options }: Query) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options)) query.set(key, String(value))
  if (fallbackLocale === false) query.set('fallback-locale', 'none')
  function appendWhere(prefix: string, value: unknown) {
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) appendWhere(prefix + '[' + key + ']', nested)
    } else if (value !== undefined) {
      query.set(prefix, String(value))
    }
  }
  if (where) appendWhere('where', where)
  for (const [field, value] of Object.entries(select ?? {})) query.set(`select[${field}]`, String(value))
  return '?' + query
}

async function read<T>(path: string, query: Query = {}): Promise<T> {
  const response = await adminHTTP(path + queryString(query))
  if (!response.ok) throw new Error('CMS request failed (' + response.status + ')')
  return response.json()
}

export function find<C extends keyof Collections>({ collection, ...query }: Query & { collection: C }) {
  return read<PaginatedDocs<Collections[C]>>(collection, query)
}

export async function findByID<C extends keyof Collections>({ collection, id, ...query }: Query & { collection: C; id: number }) {
  const response = await adminHTTP(collection + '/' + id + queryString(query))
  if (response.status === 404 || response.status === 403) return undefined
  if (!response.ok) throw new Error('CMS request failed (' + response.status + ')')
  return response.json() as Promise<Collections[C]>
}

export function findVersions({ collection, ...query }: Query & { collection: EditorialSection }) {
  return read<PaginatedDocs<{ id: string; updatedAt: string }>>(collection + '/versions', query)
}

export const adminSession = cache(async () => {
  const { user } = await read<{ user: User | null }>('users/me', { depth: 0 })
  return user?.collection === 'users' || (user && !user.collection) ? { user: { ...user, collection: 'users' as const } } : null
})

export const adminRequest = cache(async () => {
  const session = await adminSession()
  if (!session) redirect('/admin/login')
  return session
})

export const adminSites = cache(async ({ user }: Awaited<ReturnType<typeof adminRequest>>) => {
  const ids = tenantIDs(user)
  const all = isPlatformAdmin(user)
  if (!all && !ids.length) return []
  return (await find({
    collection: 'tenants', depth: 0, pagination: false, sort: 'name',
    select: { name: true, siteOrigin: true },
    where: all ? undefined : { id: { in: ids } },
  })).docs
})

export const currentSite = cache(async (site: string) => {
  const req = await adminRequest()
  const sites = await adminSites(req)
  const selected = sites.find(({ id }) => id === relationID(site))
  if (!selected) notFound()
  return { req, sites, selected }
})

export async function findEditorialDocument(site: number, locale: 'nl' | 'en', collection: EditorialSection, id?: number) {
  const { docs: [document] } = await find({
    collection, depth: 0, locale, draft: true, fallbackLocale: false, limit: 1,
    where: { tenant: { equals: site }, ...(id ? { id: { equals: id } } : {}) },
  })
  return document
}

export async function previewURL(site: number, collection: EditorialSection, id: number, locale: string) {
  const response = await adminHTTP('cms-admin/preview?' + new URLSearchParams({
    site: String(site), collection, id: String(id), locale,
  }))
  if (!response.ok) return null
  return ((await response.json()) as { url: string | null }).url
}

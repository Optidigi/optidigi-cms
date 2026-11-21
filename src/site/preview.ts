import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { AuthStrategy, PayloadRequest } from 'payload'
import type { User } from '../payload-types'
import { isPlatformAdmin, relationID, tenantIDs } from './access'

export type SiteLocale = 'nl' | 'en'
export type PreviewCollection = 'pages' | 'articles' | 'projects' | 'site-settings'
type Grant = { tenant: number; user: number; locale: SiteLocale; exp: number }

export function siteLocale(value: unknown): SiteLocale | undefined {
  return value === 'nl' || value === 'en' ? value : undefined
}

function previewKey() {
  const file = process.env.PREVIEW_SIGNING_KEY_FILE
  if (!file) return undefined
  const hex = readFileSync(file, 'utf8').trim()
  if (!/^[a-f\d]{64}$/i.test(hex)) throw new Error('Invalid preview signing key configuration.')
  return Buffer.from(hex, 'hex')
}

const permitted = (user: PayloadRequest['user'], tenant: number) =>
  isPlatformAdmin(user) || tenantIDs(user).includes(tenant)

function sign(grant: Grant, key: Buffer) {
  const body = Buffer.from(JSON.stringify(grant)).toString('base64url')
  return body + '.' + createHmac('sha256', key).update(body).digest('base64url')
}

// Returns the grant from `Authorization: Bearer <grant>` when the signature and expiry are valid.
function readGrant(headers: Headers): Grant | undefined {
  const token = headers.get('authorization')?.match(/^Bearer ([\w-]{1,256})\.([\w-]{43})$/i)
  if (!token) return undefined
  const key = previewKey()
  if (!key) return undefined
  const [, body, signature] = token
  const hmac = createHmac('sha256', key).update(body).digest()
  const received = Buffer.from(signature, 'base64url')
  if (hmac.length !== received.length || !timingSafeEqual(hmac, received)) return undefined
  try {
    const grant = JSON.parse(Buffer.from(body, 'base64url').toString()) as Partial<Grant>
    if (
      !relationID(grant.tenant) ||
      !siteLocale(grant.locale) ||
      typeof grant.exp !== 'number' ||
      grant.exp <= Date.now() ||
      !relationID(grant.user)
    ) {
      return undefined
    }
    return grant as Grant
  } catch {
    return undefined
  }
}

// The preview link opens the website's /cms-preview route with two 30-minute, read-only grants
// (this translation and the other one). `path` follows the website's preview pattern.
export async function previewURL(collection: PreviewCollection, value: unknown, localeValue: string, req: PayloadRequest) {
  const id = relationID(value)
  const locale = siteLocale(localeValue)
  if (!req.user || !locale || id === undefined) return null
  const key = previewKey()
  if (!key) return null

  const doc = await req.payload.findByID({
    collection, id, draft: true, depth: 0, locale, disableErrors: true, overrideAccess: false, req,
  })
  const tenantID = relationID(doc?.tenant)
  if (!doc || tenantID === undefined || !permitted(req.user, tenantID)) return null
  const tenant = await req.payload.findByID({
    collection: 'tenants', id: tenantID, depth: 0, disableErrors: true, overrideAccess: false, req,
  })
  if (!tenant) return null

  const grant: Grant = { tenant: tenantID, user: req.user.id, locale, exp: Date.now() + 30 * 60_000 }
  const slug = 'slug' in doc ? doc.slug : undefined
  const pattern = collection === 'site-settings' ? '/' : tenant.previewPaths?.[collection]
  const url = new URL('/cms-preview', tenant.siteOrigin)
  url.searchParams.set('grant', sign(grant, key))
  url.searchParams.set('alternateGrant', sign({ ...grant, locale: locale === 'nl' ? 'en' : 'nl' }, key))
  url.searchParams.set('locale', locale)
  url.searchParams.set('collection', collection)
  if (slug) url.searchParams.set('slug', slug)
  if (pattern && slug !== undefined) url.searchParams.set('path', pattern.replaceAll('{slug}', encodeURIComponent(slug)))
  return url.href
}

// Legacy /api/site-content draft check. Kept until every website reads through Payload's REST API.
export async function authorizePreview(req: PayloadRequest, tenant: number, locale: SiteLocale) {
  const grant = readGrant(req.headers)
  if (!grant || grant.tenant !== tenant || grant.locale !== locale) return undefined
  const user = await req.payload.findByID({ collection: 'users', id: grant.user, depth: 0, disableErrors: true, overrideAccess: true })
  if (!user) return undefined
  const actor = { ...user, collection: 'users' as const }
  return permitted(actor, tenant) ? actor : undefined
}

// REST reads a website needs for a preview: its content collections and media files.
const previewPath = /^\/api\/(pages|articles|projects|site-settings|media)(\/|$)/

// Payload auth strategy for website previews: a valid grant signs in as its user only for GET and HEAD
// requests to the content REST paths above, limited to the grant's website as an editor. Websites read
// drafts through Payload's normal REST API with `draft=true`; nothing else accepts a grant, so it can't
// write, reach the admin, server functions, chats, preferences or the user's own account.
export const previewGrantStrategy: AuthStrategy = {
  name: 'preview-grant',
  async authenticate({ headers, payload, req }) {
    if (req?.method !== 'GET' && req?.method !== 'HEAD') return { user: null }
    let path: string
    try {
      path = new URL(req.url ?? '', 'http://localhost').pathname
    } catch {
      return { user: null }
    }
    if (!previewPath.test(path)) return { user: null }
    const grant = readGrant(headers)
    if (!grant) return { user: null }
    const user = (await payload.findByID({
      collection: 'users', id: grant.user, depth: 0, disableErrors: true, overrideAccess: true,
    })) as User | null
    if (!user || !permitted({ ...user, collection: 'users' }, grant.tenant)) return { user: null }
    return {
      user: {
        ...user,
        collection: 'users',
        role: 'customer',
        tenants: [{ tenant: grant.tenant, role: 'editor' }],
      },
    }
  },
}

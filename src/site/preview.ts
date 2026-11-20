import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { PayloadRequest } from 'payload'
import { isPlatformAdmin, relationID, tenantIDs } from './access'

export type SiteLocale = 'nl' | 'en'
type PreviewCollection = 'pages' | 'site-settings'
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

export async function previewURL(
  collection: PreviewCollection,
  value: unknown,
  localeValue: string,
  req: PayloadRequest,
) {
  const id = relationID(value)
  const locale = siteLocale(localeValue)
  if (!req.user || !locale || id === undefined) return null
  const key = previewKey()
  if (!key) return null

  const doc = await req.payload.findByID({
    collection,
    id,
    draft: true,
    depth: 0,
    locale,
    disableErrors: true,
    overrideAccess: false,
    req,
  })
  if (!doc || ('slug' in doc && doc.slug !== 'home')) return null
  const tenantID = relationID(doc.tenant)
  if (tenantID === undefined || !permitted(req.user, tenantID)) return null
  const tenant = await req.payload.findByID({
    collection: 'tenants',
    id: tenantID,
    depth: 0,
    disableErrors: true,
    overrideAccess: false,
    req,
  })
  if (!tenant) return null

  const grant: Grant = {
    tenant: tenantID,
    user: req.user.id,
    locale,
    exp: Date.now() + 30 * 60_000,
  }
  const sign = (value: Grant) => {
    const body = Buffer.from(JSON.stringify(value)).toString('base64url')
    return body + '.' + createHmac('sha256', key).update(body).digest('base64url')
  }
  const url = new URL('/cms-preview', tenant.siteOrigin)
  url.searchParams.set('grant', sign(grant))
  url.searchParams.set('alternateGrant', sign({ ...grant, locale: locale === 'nl' ? 'en' : 'nl' }))
  url.searchParams.set('locale', locale)
  return url.href
}

export async function authorizePreview(req: PayloadRequest, tenant: number, locale: SiteLocale) {
  const token = req.headers.get('authorization')?.match(/^Bearer ([\w-]{1,256})\.([\w-]{43})$/i)
  if (!token) return undefined
  const key = previewKey()
  if (!key) return undefined
  const [, body, signature] = token
  const hmac = createHmac('sha256', key).update(body).digest()
  const received = Buffer.from(signature, 'base64url')
  if (hmac.length !== received.length || !timingSafeEqual(hmac, received)) return undefined

  let grant: Partial<Grant>
  try {
    grant = JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return undefined
  }
  if (
    !grant ||
    grant.tenant !== tenant ||
    grant.locale !== locale ||
    typeof grant.exp !== 'number' ||
    grant.exp <= Date.now() ||
    !relationID(grant.user)
  )
    return undefined
  const user = await req.payload.findByID({
    collection: 'users',
    id: grant.user!,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })
  if (!user) return undefined
  const actor = { ...user, collection: 'users' as const }
  return permitted(actor, tenant) ? actor : undefined
}

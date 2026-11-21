import config from '@payload-config'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import type { User } from '@/payload-types'
import { isPlatformAdmin, relationID, tenantIDs } from '@/site/access'
import { isLanguage, languageCookie, translator, type Language } from './i18n'
import { preferencesKey, readPreferences, type Preferences } from './preferences'

// All reads in the admin go through Payload's Local API as the signed-in user, so Payload's
// access control and the multi-tenant plugin apply exactly as they do for REST.
export const getSession = cache(async () => {
  // Read the request first: it makes every admin page dynamic, so the build never connects to Postgres.
  const requestHeaders = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  return { payload, user: user?.collection === 'users' ? (user as User & { collection: 'users' }) : null }
})

export async function requireUser() {
  const session = await getSession()
  if (!session.user) redirect('/admin/login')
  return { payload: session.payload, user: session.user }
}

export async function requirePlatformAdmin() {
  const session = await requireUser()
  if (!isPlatformAdmin(session.user)) notFound()
  return session
}

export const getPreferences = cache(async (): Promise<Preferences> => {
  const { payload, user } = await getSession()
  if (!user) return readPreferences(undefined)
  const { docs: [doc] } = await payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    // Newest first, in case an older duplicate row is still around.
    sort: '-updatedAt',
    user,
    where: {
      key: { equals: preferencesKey },
      'user.relationTo': { equals: 'users' },
      'user.value': { equals: user.id },
    },
  })
  return readPreferences(doc?.value)
})

export const getLanguage = cache(async (): Promise<Language> => {
  const { user } = await getSession()
  if (user) return (await getPreferences()).language
  const cookie = (await cookies()).get(languageCookie)?.value
  return isLanguage(cookie) ? cookie : 'nl'
})

export async function getTranslator() {
  return translator(await getLanguage())
}

export const getSites = cache(async () => {
  const { payload, user } = await requireUser()
  const ids = tenantIDs(user)
  if (!isPlatformAdmin(user) && !ids.length) return []
  const { docs } = await payload.find({
    collection: 'tenants',
    depth: 0,
    limit: 500,
    overrideAccess: false,
    pagination: false,
    sort: 'name',
    user,
    select: { name: true, slug: true, siteOrigin: true },
    where: isPlatformAdmin(user) ? undefined : { id: { in: ids } },
  })
  return docs
})

export async function requireSite(siteParam: string) {
  const session = await requireUser()
  const id = relationID(siteParam)
  const site = (await getSites()).find((candidate) => candidate.id === id)
  if (!site) notFound()
  return { ...session, site }
}

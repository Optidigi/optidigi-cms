'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { canUseSite } from './content'
import { getHomepage, studioRequest } from './data'

export async function signIn(form: FormData) {
  const email = form.get('email')
  const password = form.get('password')
  if (typeof email !== 'string' || typeof password !== 'string') redirect('/studio/login?error=1')
  try {
    await login({ collection: 'users', config, email, password })
  } catch {
    redirect('/studio/login?error=1')
  }
  redirect('/studio')
}

export async function signOut() {
  await logout({ config })
  redirect('/studio/login')
}

const homepageInput = z.object({
  site: z.coerce.number().int().positive(),
  locale: z.enum(['nl', 'en']),
  revision: z.string().min(1),
  heading: z.string().max(200),
  description: z.string().max(1000),
  intent: z.enum(['draft', 'publish']),
})

const saving = new Set<number>()

export async function createHomepage(form: FormData) {
  const site = Number(form.get('site'))
  const req = await studioRequest()
  if (!canUseSite(req, site)) redirect('/studio')
  const route = '/studio/' + site
  let result = 'saved'
  try {
    if (!(await getHomepage(req, site, 'nl'))) {
      await req.payload.create({
        collection: 'pages',
        req,
        overrideAccess: false,
        draft: true,
        locale: 'nl',
        data: { tenant: site, slug: 'home', title: 'Homepage', _status: 'draft' },
      })
    }
  } catch {
    result = 'failed'
  }
  redirect(route + '?result=' + result)
}

export async function commitHomepage(input: unknown) {
  const parsed = homepageInput.safeParse(input)
  if (!parsed.success) return { result: 'failed' } as const
  const { site, locale, revision, heading, description, intent } = parsed.data
  const req = await studioRequest()
  const page = await getHomepage(req, site, locale)
  if (!page) return { result: 'failed' } as const
  if (saving.has(page.id)) return { result: 'conflict' } as const
  saving.add(page.id)
  try {
    const latest = await getHomepage(req, site, locale)
    if (latest?.updatedAt !== revision) return { result: 'conflict' } as const
    const updated = await req.payload.update({
      collection: 'pages',
      id: page.id,
      req,
      overrideAccess: false,
      overrideLock: false,
      depth: 0,
      draft: intent === 'draft',
      locale,
      publishAllLocales: false,
      data: {
        title: latest.title || (locale === 'nl' ? 'Homepage' : 'Home'),
        heading,
        description,
        _status: intent === 'draft' ? 'draft' : 'published',
      },
    })
    const saved = await getHomepage(req, site, locale)
    return {
      result: intent === 'draft' ? 'saved' : 'published',
      revision: saved?.updatedAt ?? updated.updatedAt,
    } as const
  } catch {
    return { result: 'failed' } as const
  } finally {
    saving.delete(page.id)
  }
}

export async function restoreHomepage(form: FormData) {
  const site = Number(form.get('site'))
  const locale = form.get('locale') === 'en' ? 'en' : 'nl'
  const id = String(form.get('version') ?? '')
  const route = '/studio/' + site + '?locale=' + locale
  const req = await studioRequest()
  const page = await getHomepage(req, site, locale)
  if (!page || !id || saving.has(page.id)) redirect(route + '&result=failed')
  saving.add(page.id)
  let result = 'failed'
  try {
    const {
      docs: [version],
    } = await req.payload.findVersions({
      collection: 'pages',
      where: { id: { equals: id }, parent: { equals: page.id } },
      limit: 1,
      depth: 0,
      locale,
      fallbackLocale: false,
      req,
      overrideAccess: false,
    })
    if (version) {
      const { title, heading, description, body, seo } = version.version
      await req.payload.update({
        collection: 'pages',
        id: page.id,
        draft: true,
        locale,
        req,
        overrideAccess: false,
        overrideLock: false,
        data: {
          title: title ?? null,
          heading: heading ?? null,
          description: description ?? null,
          body: body ?? null,
          seo: { title: seo?.title ?? null, description: seo?.description ?? null },
          _status: 'draft',
        },
      })
      result = 'restored'
    }
  } catch {
    result = 'failed'
  } finally {
    saving.delete(page.id)
  }
  revalidatePath('/studio/' + site)
  redirect(route + '&result=' + result)
}

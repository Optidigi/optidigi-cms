'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
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

export async function saveHomepage(form: FormData) {
  const parsed = homepageInput.safeParse(Object.fromEntries(form))
  if (!parsed.success) redirect('/studio')
  const { site, locale, revision, heading, description, intent } = parsed.data
  const req = await studioRequest()
  const route = '/studio/' + site + '?locale=' + locale
  if (locale !== 'nl' && intent === 'publish') redirect(route + '&result=failed')
  const page = await getHomepage(req, site, locale)
  if (!page) redirect('/studio')
  if (page.updatedAt !== revision) redirect(route + '&result=conflict')
  try {
    await req.payload.update({
      collection: 'pages',
      id: page.id,
      req,
      overrideAccess: false,
      overrideLock: false,
      depth: 0,
      draft: intent === 'draft',
      locale,
      publishAllLocales: false,
      data: { heading, description, _status: intent === 'draft' ? 'draft' : 'published' },
    })
  } catch {
    redirect(route + '&result=failed')
  }
  revalidatePath('/studio/' + site)
  redirect(route + '&result=' + (intent === 'draft' ? 'saved' : 'published'))
}

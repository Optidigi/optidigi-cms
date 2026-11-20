'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminRoot, currentSite, findHomepage } from './data'

const formSchema = z.object({
  site: z.string().regex(/^\d+$/),
  section: z.enum(['pages', 'site-settings']),
  id: z.coerce.number().int().positive(),
  revision: z.string().min(1),
  locale: z.enum(['nl', 'en']),
  intent: z.enum(['draft', 'publish', 'restore']),
  title: z.string().max(250).optional(),
  heading: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  name: z.string().max(150).optional(),
  contactEmail: z.union([z.email(), z.literal('')]).optional(),
  phone: z.string().max(80).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  version: z.string().regex(/^\d+$/).optional(),
})

const linkSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(120),
      href: z
        .string()
        .regex(/^\/(?![\/\\])[^\\\s]*$/)
        .max(500),
    }),
  )
  .max(100)

export type SaveResult = 'saved' | 'published' | 'restored' | 'conflict' | 'invalid' | 'failed'
const writing = new Set<string>()

export async function saveComparison(form: FormData): Promise<SaveResult> {
  const parsed = formSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return 'invalid'
  const input = parsed.data
  const { site, id, locale, section, intent } = input
  const { req, selected } = await currentSite(site)
  const draft = intent !== 'publish'
  const key = section + ':' + id
  if (writing.has(key)) return 'conflict'
  writing.add(key)

  try {
    const options = { req, locale, overrideAccess: false as const, depth: 0 as const }
    const seo = { title: input.seoTitle, description: input.seoDescription }
    if (section === 'pages') {
      const home = await findHomepage(req, selected.id, locale)
      if (!home || home.id !== id) return 'failed'
      if (home.updatedAt !== input.revision) return 'conflict'
      const data = {
        title: input.title,
        heading: input.heading,
        description: input.description,
        seo,
      }
      if (intent === 'restore') {
        if (!input.version) return 'invalid'
        const {
          docs: [snapshot],
        } = await req.payload.findVersions({
          ...options,
          collection: 'pages',
          fallbackLocale: false,
          limit: 1,
          where: { id: { equals: input.version }, parent: { equals: home.id } },
        })
        if (!snapshot) return 'failed'
        const { title, heading, description, seo, body } = snapshot.version
        await req.payload.update({
          ...options,
          collection: 'pages',
          id,
          draft: true,
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
      } else {
        if (!data.title?.trim()) return 'invalid'
        await req.payload.update({
          ...options,
          collection: 'pages',
          id,
          draft,
          overrideLock: false,
          publishAllLocales: false,
          data: { ...data, _status: draft ? 'draft' : 'published' },
        })
      }
    } else {
      if (intent === 'restore' || !input.name?.trim()) return 'invalid'
      const {
        docs: [settings],
      } = await req.payload.find({
        ...options,
        collection: 'site-settings',
        draft: true,
        fallbackLocale: false,
        limit: 1,
        where: { id: { equals: id }, tenant: { equals: selected.id } },
      })
      if (!settings) return 'failed'
      if (settings.updatedAt !== input.revision) return 'conflict'
      const hrefs = form.getAll('navHref')
      const navigation = linkSchema.safeParse(
        form.getAll('navLabel').map((label, index) => ({ label, href: hrefs[index] })),
      )
      if (!navigation.success) return 'invalid'
      await req.payload.update({
        ...options,
        collection: 'site-settings',
        id,
        draft,
        overrideLock: false,
        publishAllLocales: false,
        data: {
          name: input.name,
          contactEmail: input.contactEmail || null,
          phone: input.phone,
          navigation: navigation.data,
          seo,
          _status: draft ? 'draft' : 'published',
        },
      })
    }
  } catch {
    return 'failed'
  } finally {
    writing.delete(key)
  }
  revalidatePath(adminRoot + '/' + site + '/' + section)
  return intent === 'restore' ? 'restored' : draft ? 'saved' : 'published'
}

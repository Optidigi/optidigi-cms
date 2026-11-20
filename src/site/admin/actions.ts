import { z } from 'zod'
import type { PayloadRequest } from 'payload'
import { canAccessSite, findEditorialDocument } from './access'
import type { SaveResult } from './contracts'
import { editableBody } from './rich-text-data'

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(150)

const formSchema = z.object({
  site: z.string().regex(/^\d+$/),
  section: z.enum(['pages', 'articles', 'projects', 'site-settings']),
  id: z.coerce.number().int().positive().optional(),
  revision: z.string().optional(),
  locale: z.enum(['nl', 'en']),
  intent: z.enum(['draft', 'publish', 'restore', 'delete']),
  title: z.string().max(250).optional(),
  slug: slugSchema.optional(),
  heading: z.string().max(200).optional(),
  description: z.string().max(3000).optional(),
  body: z.string().max(500_000).optional(),
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

const writing = new Set<string>()

export async function saveEditorial(
  req: PayloadRequest,
  form: FormData,
): Promise<{ result: SaveResult; id?: number }> {
  const parsed = formSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { result: 'invalid' }
  const input = parsed.data
  const { site, id, locale, section, intent } = input
  const tenant = canAccessSite(req, site)
  if (!tenant) return { result: 'failed' }
  const draft = intent !== 'publish'
  const key = tenant + ':' + section + ':' + (id ?? 'new')
  if (writing.has(key)) return { result: 'conflict' }
  writing.add(key)

  try {
    const options = { req, locale, overrideAccess: false as const, depth: 0 as const }
    const previous =
      id || section === 'site-settings'
        ? await findEditorialDocument(req, tenant, locale, section, id)
        : undefined
    if (id && (!previous || previous.id !== id)) return { result: 'failed' }
    if (previous && (!id || previous.updatedAt !== input.revision)) return { result: 'conflict' }
    if (intent === 'delete') {
      if (
        !previous ||
        !id ||
        section === 'site-settings' ||
        ('slug' in previous && previous.slug === 'home')
      ) {
        return { result: 'invalid' }
      }
      await req.payload.delete({ ...options, collection: section, id, overrideLock: false })
      return { result: 'deleted' }
    }
    const seo = { title: input.seoTitle, description: input.seoDescription }
    let savedID = id
    if (section === 'site-settings') {
      if (intent === 'restore') {
        if (!id || !input.version) return { result: 'invalid' }
        const {
          docs: [snapshot],
        } = await req.payload.findVersions({
          ...options,
          collection: section,
          fallbackLocale: false,
          limit: 1,
          where: { id: { equals: input.version }, parent: { equals: id } },
        })
        if (!snapshot) return { result: 'failed' }
        const { name, contactEmail, phone, navigation, seo } = snapshot.version
        await req.payload.update({
          ...options,
          collection: section,
          id,
          draft: true,
          overrideLock: false,
          data: { name, contactEmail, phone, navigation, seo, _status: 'draft' },
        })
      } else {
        if (!input.name?.trim()) return { result: 'invalid' }
        const hrefs = form.getAll('navHref')
        const navigation = linkSchema.safeParse(
          form.getAll('navLabel').map((label, index) => ({
            label,
            href: hrefs[index],
          })),
        )
        if (!navigation.success) return { result: 'invalid' }
        const data = {
          name: input.name,
          contactEmail: input.contactEmail || null,
          phone: input.phone,
          navigation: navigation.data,
          seo,
          _status: draft ? ('draft' as const) : ('published' as const),
        }
        if (id)
          await req.payload.update({
            ...options,
            collection: section,
            id,
            data,
            draft,
            overrideLock: false,
            publishAllLocales: false,
          })
        else
          savedID = (
            await req.payload.create({
              ...options,
              collection: section,
              draft,
              publishAllLocales: false,
              data: { ...data, tenant: tenant },
            })
          ).id
      }
    } else if (intent === 'restore') {
      if (!id || !input.version) return { result: 'invalid' }
      const {
        docs: [snapshot],
      } = await req.payload.findVersions({
        ...options,
        collection: section,
        fallbackLocale: false,
        limit: 1,
        where: { id: { equals: input.version }, parent: { equals: id } },
      })
      if (!snapshot) return { result: 'failed' }
      const { title, heading, description, seo, body } = snapshot.version
      await req.payload.update({
        ...options,
        collection: section,
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
      if (!input.title?.trim() || !input.slug) return { result: 'invalid' }
      if (
        section === 'pages' &&
        previous &&
        'slug' in previous &&
        (previous.slug === 'home' || input.slug === 'home') &&
        previous.slug !== input.slug
      )
        return { result: 'invalid' }
      const data = {
        title: input.title,
        slug: input.slug,
        heading: input.heading,
        description: input.description,
        seo,
        _status: draft ? ('draft' as const) : ('published' as const),
      }
      let bodyData = !draft && previous && 'body' in previous ? { body: previous.body } : {}
      if (input.body !== undefined) {
        const body: unknown = JSON.parse(input.body)
        if (
          !editableBody(body) ||
          (previous && 'body' in previous && previous.body && !editableBody(previous.body))
        ) {
          return { result: 'invalid' }
        }
        bodyData = { body }
      }
      if (id)
        await req.payload.update({
          ...options,
          collection: section,
          id,
          draft,
          overrideLock: false,
          publishAllLocales: false,
          data: { ...data, ...bodyData },
        })
      else
        savedID = (
          await req.payload.create({
            ...options,
            collection: section,
            draft,
            publishAllLocales: false,
            data: { ...data, ...bodyData, tenant: tenant },
          })
        ).id
    }
    return {
      result: intent === 'restore' ? 'restored' : draft ? 'saved' : 'published',
      id: savedID,
    }
  } catch {
    return { result: 'failed' }
  } finally {
    writing.delete(key)
  }
}

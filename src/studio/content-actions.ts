'use server'

import { redirect } from 'next/navigation'
import type { SiteLocale } from '../site/preview'
import { z } from 'zod'
import { getPlainBody, makePlainBody } from './plain-body'
import { studioRequest } from './data'
import { canUseSite, isStudioSection } from './content'

const recordID = z.coerce.number().int().positive()
const editorial = z.object({
  title: z.string().trim().min(1).max(250),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  heading: z.string().max(500),
  description: z.string().max(2000),
  seoTitle: z.string().max(200),
  seoDescription: z.string().max(500),
})
const navigationSchema = z
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
export async function saveStudioContent(form: FormData) {
  const site = Number(form.get('site'))
  const collection = String(form.get('collection') ?? '')
  const id = recordID.safeParse(form.get('id')).data
  const locale: SiteLocale = form.get('locale') === 'en' ? 'en' : 'nl'
  if (!isStudioSection(collection)) redirect('/studio')
  const req = await studioRequest()
  if (!canUseSite(req, site)) redirect('/studio')
  const route = '/studio/' + site + '/content/' + collection + '?locale=' + locale
  const options = { req, overrideAccess: false as const, depth: 0 as const }
  const intent = form.get('intent')
  let selected = id
  let result = 'saved'
  try {
    let previousBody: unknown
    if (id) {
      const { docs } = await req.payload.find({
        ...options,
        collection,
        where: { id: { equals: id }, tenant: { equals: site } },
        draft: collection !== 'media',
        locale,
        fallbackLocale: false,
        limit: 1,
      })
      if (!docs[0]) throw Error('Missing record')
      if (collection === 'pages' && 'slug' in docs[0] && docs[0].slug === 'home')
        throw Error('Use the homepage editor')
      if ('body' in docs[0]) previousBody = docs[0].body
    }
    if (intent === 'delete') {
      if (!id || collection === 'site-settings') throw Error('Cannot delete')
      await req.payload.delete({ ...options, collection, id, overrideLock: false })
      selected = undefined
      result = 'deleted'
    } else if (collection === 'media') {
      const alt = z.string().trim().min(1).max(300).parse(form.get('alt'))
      const upload = form.get('file')
      if (id) {
        await req.payload.update({ ...options, collection, id, data: { alt }, overrideLock: false })
      } else {
        if (!(upload instanceof File) || !upload.size || upload.size > 8 * 1024 * 1024)
          throw Error('Invalid file')
        const doc = await req.payload.create({
          ...options,
          collection,
          data: { tenant: site, alt },
          file: {
            name: upload.name,
            data: Buffer.from(await upload.arrayBuffer()),
            size: upload.size,
            mimetype: upload.type,
          },
        })
        selected = doc.id
      }
    } else if (collection === 'site-settings') {
      const values = z
        .object({
          name: z.string().trim().min(1).max(150),
          contactEmail: z.union([z.email(), z.literal('')]),
          phone: z.string().max(80),
          seoTitle: z.string().max(200),
          seoDescription: z.string().max(500),
        })
        .parse(Object.fromEntries(form))
      const links = form.getAll('navigationHref')
      const navigation = navigationSchema.parse(
        form.getAll('navigationLabel').map((label, index) => ({ label, href: links[index] })),
      )
      const draft = intent !== 'publish'
      const data = {
        tenant: site,
        name: values.name,
        contactEmail: values.contactEmail || null,
        phone: values.phone,
        navigation,
        seo: { title: values.seoTitle, description: values.seoDescription },
        _status: draft ? ('draft' as const) : ('published' as const),
      }
      const doc = id
        ? await req.payload.update({
            ...options,
            collection,
            id,
            data,
            draft,
            locale,
            publishAllLocales: false,
            overrideLock: false,
          })
        : await req.payload.create({
            ...options,
            collection,
            data,
            draft,
            locale,
            publishAllLocales: false,
          })
      selected = doc.id
    } else {
      const values = editorial.parse(Object.fromEntries(form))
      if (values.slug === 'home' && collection === 'pages') throw Error('Use the homepage editor')
      const draft = intent !== 'publish'
      const data = {
        tenant: site,
        title: values.title,
        slug: values.slug,
        heading: values.heading,
        description: values.description,
        seo: { title: values.seoTitle, description: values.seoDescription },
        _status: draft ? ('draft' as const) : ('published' as const),
      }
      const submitted = form.get('body')
      const before = getPlainBody(previousBody)
      const body =
        typeof submitted === 'string' && before !== null && submitted !== before
          ? makePlainBody(z.string().max(24000).parse(submitted))
          : undefined
      if (id) {
        await req.payload.update({
          ...options,
          collection,
          id,
          draft,
          locale,
          publishAllLocales: false,
          overrideLock: false,
          data: { ...data, ...(body && { body }) },
        })
      } else {
        const doc = await req.payload.create({
          ...options,
          collection,
          draft,
          locale,
          publishAllLocales: false,
          data: { ...data, ...(body && { body }) },
        })
        selected = doc.id
      }
    }
  } catch {
    result = 'failed'
  }
  redirect(route + (selected ? '&id=' + selected : '') + '&result=' + result)
}

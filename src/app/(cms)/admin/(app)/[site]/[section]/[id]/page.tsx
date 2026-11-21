import { notFound } from 'next/navigation'
import { createPayloadRequest } from 'payload'
import { getLanguage, getTranslator, requireSite } from '@/cms/server'
import { contentLocale, isSection, sections } from '@/cms/sections'
import { DocumentEditor, type EditorDocument } from '@/cms/content/document-editor'
import { SiteHeader } from '@/cms/shell/site-header'
import { relationID } from '@/site/access'
import { previewURL } from '@/site/preview'

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; section: string; id: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { site: siteParam, section, id: idParam } = await params
  if (!isSection(section)) notFound()
  const [{ payload, user, site }, t, language] = await Promise.all([requireSite(siteParam), getTranslator(), getLanguage()])
  const { collection, label, preview } = sections[section]
  const locale = contentLocale((await searchParams).locale)
  const id = idParam === 'new' ? undefined : relationID(idParam)
  if (idParam !== 'new' && !id) notFound()

  let document: EditorDocument | undefined
  let versions: { id: string; updatedAt: string; status?: string | null }[] = []
  let lock: { email?: string } | undefined
  let previewHref: string | null = null
  if (id) {
    const doc = await payload.findByID({
      collection, id, depth: 0, draft: true, fallbackLocale: false, locale, overrideAccess: false, user,
      includeLockStatus: true, disableErrors: true,
    })
    if (!doc || relationID(doc.tenant) !== site.id) notFound()
    document = {
      id: doc.id,
      title: doc.title ?? '',
      slug: doc.slug ?? '',
      heading: doc.heading ?? '',
      description: doc.description ?? '',
      body: doc.body ?? null,
      seo: { title: doc.seo?.title ?? '', description: doc.seo?.description ?? '' },
      status: doc._status ?? 'draft',
      updatedAt: doc.updatedAt,
    }
    const locked = doc as typeof doc & { _isLocked?: boolean; _userEditing?: unknown }
    if (locked._isLocked && relationID(locked._userEditing) !== user.id) {
      const editing = locked._userEditing
      lock = { email: editing && typeof editing === 'object' && 'email' in editing ? String(editing.email) : undefined }
    }
    const result = await payload.findVersions({
      collection, depth: 0, limit: 25, locale, overrideAccess: false, user, sort: '-updatedAt',
      select: { updatedAt: true, version: { _status: true } },
      where: { parent: { equals: id } },
    })
    versions = result.docs.map((version) => ({
      id: String(version.id),
      updatedAt: version.updatedAt,
      status: version.version?._status,
    }))
    if (preview) {
      // The same preview function Payload's collection config uses (admin.preview).
      previewHref = await previewURL('pages', id, locale, await createPayloadRequest({ payload, user }))
    }
  }

  const title = document?.title || t('newDocument')
  return (
    <>
      <SiteHeader
        crumbs={[
          { label: site.name, href: `/admin/${site.id}` },
          { label: t(label), href: `/admin/${site.id}/${section}?locale=${locale}` },
          { label: title },
        ]}
      />
      <DocumentEditor
        key={`${document?.id ?? 'new'}-${locale}`}
        site={site.id}
        section={section}
        collection={collection}
        locale={locale}
        language={language}
        userID={user.id}
        document={document}
        versions={versions}
        lock={lock}
        previewHref={previewHref}
      />
    </>
  )
}

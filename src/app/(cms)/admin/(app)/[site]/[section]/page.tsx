import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'
import { Button } from '@/components/ui/button'
import { getLanguage, getTranslator, requireSite } from '@/cms/server'
import { contentLocale, isSection, sections } from '@/cms/sections'
import { CollectionTable } from '@/cms/content/collection-table'
import { CollectionToolbar } from '@/cms/content/collection-toolbar'
import { ListPagination } from '@/cms/content/list-pagination'
import { PageBody, PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

type Search = { q?: string; status?: string; page?: string; locale?: string }

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; section: string }>
  searchParams: Promise<Search>
}) {
  const { site: siteParam, section } = await params
  if (!isSection(section)) notFound()
  const search = await searchParams
  const [{ payload, user, site }, t, language] = await Promise.all([requireSite(siteParam), getTranslator(), getLanguage()])
  const { collection, label } = sections[section]
  const locale = contentLocale(search.locale)
  const page = Math.max(1, Math.min(1000, Number(search.page) || 1))
  const where: Where = { and: [{ tenant: { equals: site.id } }] }
  if (search.q?.trim()) where.and!.push({ title: { like: search.q.trim().slice(0, 100) } })
  if (search.status === 'published' || search.status === 'draft') where.and!.push({ _status: { equals: search.status } })

  const result = await payload.find({
    collection,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 20,
    locale,
    overrideAccess: false,
    page,
    select: { title: true, slug: true, _status: true, updatedAt: true },
    sort: '-updatedAt',
    user,
    where,
  })
  const base = `/admin/${site.id}/${section}`

  return (
    <>
      <SiteHeader crumbs={[{ label: site.name, href: `/admin/${site.id}` }, { label: t(label) }]} />
      <PageBody>
        <PageTitle
          title={t(label)}
          actions={
            <Button nativeButton={false} render={<Link href={`${base}/new?locale=${locale}`} />}>
              <PlusIcon data-icon="inline-start" />
              {t('newItem')}
            </Button>
          }
        />
        <CollectionToolbar />
        <CollectionTable
          base={base}
          collection={collection}
          locale={locale}
          language={language}
          rows={result.docs.map(({ id, title, slug, _status, updatedAt }) => ({ id, title, slug, status: _status, updatedAt }))}
        />
        <ListPagination page={result.page ?? 1} pages={result.totalPages} />
      </PageBody>
    </>
  )
}

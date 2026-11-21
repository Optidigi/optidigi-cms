import { getLanguage, getTranslator, requireSite } from '@/cms/server'
import { ListPagination } from '@/cms/content/list-pagination'
import { MediaLibrary } from '@/cms/media/media-library'
import { PageBody, PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function MediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ payload, user, site }, t, language] = await Promise.all([
    requireSite((await params).site),
    getTranslator(),
    getLanguage(),
  ])
  const page = Math.max(1, Math.min(1000, Number((await searchParams).page) || 1))
  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 24,
    overrideAccess: false,
    page,
    sort: '-createdAt',
    user,
    where: { tenant: { equals: site.id } },
  })
  return (
    <>
      <SiteHeader crumbs={[{ label: site.name, href: `/admin/${site.id}` }, { label: t('media') }]} />
      <PageBody>
        <PageTitle title={t('media')} description={t('mediaDescription')} />
        <MediaLibrary
          site={site.id}
          language={language}
          items={result.docs.map(({ id, alt, url, filename, filesize, width, height, updatedAt }) => ({
            id, alt, url: url ?? '', filename: filename ?? '', filesize: filesize ?? 0, width: width ?? 0, height: height ?? 0, updatedAt,
          }))}
        />
        <ListPagination page={result.page ?? 1} pages={result.totalPages} />
      </PageBody>
    </>
  )
}

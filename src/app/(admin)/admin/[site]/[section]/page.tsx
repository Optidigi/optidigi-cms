import { SettingsWorkspace } from '@/admin/settings-workspace'
import { PageContainer } from '@/admin/page-container'
import { findVersions, find } from '@/admin/data'
import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CollectionToolbar } from '@/admin/collection-toolbar'
import {
  adminRoot,
  currentSite,
  editorialSections,
  findEditorialDocument,
  type EditorialSection,
} from '@/admin/data'
import { Editor } from '@/admin/editor'
import { previewURL } from '@/admin/data'
import { isPlatformAdmin, relationID } from '@/site/access'

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; section: string }>
  searchParams: Promise<{
    locale?: string
    id?: string
    page?: string
    new?: string
    q?: string
    panel?: string
    sort?: string
    status?: string
  }>
}) {
  const t = await adminTranslations()

  const { site, section: value } = await params
  if (!Object.hasOwn(editorialSections, value)) notFound()
  const section = value as EditorialSection
  const query = await searchParams
  const locale = query.locale === 'en' ? 'en' : 'nl'
  const { req, selected } = await currentSite(site)
  const root = adminRoot + '/' + selected.id + '/' + section
  const localized = root + '?locale=' + locale
  const isSettings = section === 'site-settings'
  const id = relationID(query.id)
  if (query.id && !id) notFound()
  const document =
    isSettings || id ? await findEditorialDocument(selected.id, locale, section, id) : undefined
  if (id && !document) notFound()
  const editing = Boolean(document || query.new === '1' || isSettings)
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 150) : ''

  const sort = query.sort === 'name' || query.sort === 'oldest' ? query.sort : 'recent'
  const status = query.status === 'draft' || query.status === 'published' ? query.status : ''
  const options = {
    locale,
    depth: 0 as const,
    fallbackLocale: false as const,
  }
  const pageNumber = /^\d+$/.test(query.page ?? '')
    ? Math.max(1, Math.min(10000, Number(query.page)))
    : 1
  const list =
    !isSettings && !editing
      ? await find({
          ...options,
          collection: section,
          draft: true,
          limit: 20,
          page: pageNumber,
          sort: sort === 'name' ? 'title' : sort === 'oldest' ? 'updatedAt' : '-updatedAt',
          where: {
            tenant: { equals: selected.id },
            ...(search ? { title: { contains: search } } : {}),
            ...(status ? { _status: { equals: status } } : {}),
          },
          select: { slug: true, title: true, _status: true, updatedAt: true },
        })
      : undefined
  const supportedPreview = section === 'pages' || section === 'site-settings'
  const [preview, versions] = await Promise.all([
    document && supportedPreview ? previewURL(selected.id, section, document.id, locale) : null,
    document
      ? findVersions({
          ...options,
          collection: section,
          where: { parent: { equals: document.id } },
          limit: 6,
          sort: '-updatedAt',
        }).then(({ docs }) => docs.map(({ id, updatedAt }) => ({ id, updatedAt })))
      : [],
  ])
  const canDelete =
    isPlatformAdmin(req.user) ||
    Boolean(
      req.user?.tenants?.some(
        (entry) => entry.role === 'admin' && relationID(entry.tenant) === selected.id,
      ),
    )
  const title = document
    ? 'title' in document
      ? document.title || 'Document'
      : t(editorialSections[section])
    : t(editorialSections[section])

  if (isSettings) {
    const settingsPanel =
      document && (query.panel === 'navigation' || query.panel === 'seo') ? query.panel : 'website'
    return (
      <SettingsWorkspace
        site={selected}
        current={settingsPanel}
        locale={locale}
        title={t(
          settingsPanel === 'navigation'
            ? 'Navigatie'
            : settingsPanel === 'seo'
              ? 'SEO'
              : 'Website-instellingen',
        )}
      >
        <Editor
          key={locale + settingsPanel + (document?.id ?? 'new')}
          document={document ?? {}}
          {...{ locale, section, versions, preview, canDelete, settingsPanel }}
          site={selected.id}
        />
      </SettingsWorkspace>
    )
  }

  return (
    <PageContainer
      title={title}
      description={selected.name}
      breadcrumb={
        editing &&
        !isSettings && (
          <Link href={localized} className="text-sm text-muted-foreground hover:underline">
            {t(editorialSections[section])}
          </Link>
        )
      }
      action={
        !editing && (
          <Button nativeButton={false} render={<Link href={localized + '&new=1'} />}>
            <Plus />
            {t('Nieuw document')}
          </Button>
        )
      }
    >
      {editing ? (
        <Editor
          key={section + locale + (document?.id ?? 'new')}
          document={document ?? {}}
          {...{ locale, section, versions, preview, canDelete }}
          site={selected.id}
        />
      ) : (
        <>
          <CollectionToolbar
            action={root}
            locale={locale}
            search={search}
            sort={sort}
            status={status}
            placeholder={t('Zoek op titel')}
          />
          {list?.docs.length ? (
            <Card className="py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Titel')}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t('Gewijzigd')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.docs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Link
                            href={localized + '&id=' + doc.id}
                            className="font-medium hover:underline"
                          >
                            {doc.title ||
                              (doc.slug === 'home' ? 'Homepage' : t('Naamloos document'))}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc._status === 'published' ? 'secondary' : 'outline'}>
                            {doc._status === 'published' ? t('Gepubliceerd') : t('Concept')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.updatedAt).toLocaleDateString(t('nl-NL'), {
                            timeZone: 'Europe/Amsterdam',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(list.hasPrevPage || list.hasNextPage) && (
                  <div className="flex flex-wrap gap-2 border-t p-3">
                    {list.hasPrevPage && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link
                            href={
                              localized +
                              '&' +
                              new URLSearchParams({ q: search, sort, status }) +
                              '&page=' +
                              list.prevPage
                            }
                          />
                        }
                      >
                        {t('Vorige')}
                      </Button>
                    )}
                    {list.hasNextPage && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link
                            href={
                              localized +
                              '&' +
                              new URLSearchParams({ q: search, sort, status }) +
                              '&page=' +
                              list.nextPage
                            }
                          />
                        }
                      >
                        {t('Volgende')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search || status ? t('Geen resultaten') : t('Nog geen documenten')}
                  </EmptyTitle>
                  {search && <EmptyDescription>{t('Probeer een andere titel.')}</EmptyDescription>}
                </EmptyHeader>
              </Empty>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  )
}

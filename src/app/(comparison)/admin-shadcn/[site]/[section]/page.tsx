import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  adminRoot,
  currentSite,
  editorialSections,
  findHomepage,
  type EditorialSection,
} from '@/admin-comparison/data'
import { Editor } from '@/admin-comparison/editor'
import { previewURL, siteLocale } from '@/site/preview'

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; section: string }>
  searchParams: Promise<{ locale?: string; id?: string; page?: string }>
}) {
  const { site, section: value } = await params
  if (!Object.hasOwn(editorialSections, value)) notFound()
  const section = value as EditorialSection
  const query = await searchParams
  const locale = siteLocale(query.locale) ?? 'nl'
  const { req, selected } = await currentSite(site)
  const root = adminRoot + '/' + selected.id + '/' + section
  const localized = root + '?locale=' + locale
  const options = {
    req,
    locale,
    overrideAccess: false as const,
    depth: 0 as const,
    fallbackLocale: false as const,
  }
  const where = { tenant: { equals: selected.id } }
  const homepage =
    section === 'pages' && query.id ? await findHomepage(req, selected.id, locale) : undefined
  if (query.id && (!homepage || documentID(query.id) !== homepage.id)) notFound()
  const settings =
    section === 'site-settings'
      ? (
          await req.payload.find({
            ...options,
            collection: 'site-settings',
            where,
            draft: true,
            limit: 1,
          })
        ).docs[0]
      : undefined
  const document = homepage ?? settings
  const pageNumber = /^\d+$/.test(query.page ?? '')
    ? Math.max(1, Math.min(10000, Number(query.page)))
    : 1
  const list =
    section === 'pages' && !document
      ? await req.payload.find({
          ...options,
          collection: 'pages',
          where,
          draft: true,
          limit: 20,
          page: pageNumber,
          sort: '-updatedAt',
          select: { slug: true, title: true, _status: true, updatedAt: true },
        })
      : undefined
  const [preview, versions] = await Promise.all([
    document ? previewURL(section, document.id, locale, req) : null,
    homepage
      ? req.payload
          .findVersions({
            ...options,
            collection: 'pages',
            where: { parent: { equals: homepage.id } },
            limit: 6,
            sort: '-updatedAt',
          })
          .then(({ docs }) => docs)
      : [],
  ])

  return (
    <section className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {homepage && (
            <Link href={localized} className="text-sm text-muted-foreground hover:underline">
              Pagina’s
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {homepage ? 'Homepage' : editorialSections[section]}
          </h1>
          <p className="text-sm text-muted-foreground">{selected.name}</p>
        </div>
        <Tabs value={locale}>
          <TabsList>
            {(['nl', 'en'] as const).map((code) => (
              <TabsTrigger
                key={code}
                value={code}
                nativeButton={false}
                render={
                  <Link href={root + '?locale=' + code + (homepage ? '&id=' + homepage.id : '')} />
                }
              >
                {code === 'nl' ? 'Nederlands' : 'English'}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>
      {document && (
        <Editor
          key={section + locale + document.id}
          {...{ document, locale, section, versions, preview }}
          site={selected.id}
        />
      )}
      {list?.docs.length ? (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gewijzigd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.docs.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={
                          page.slug === 'home'
                            ? localized + '&id=' + page.id
                            : '/admin/collections/pages/' + page.id
                        }
                      >
                        {page.title || (page.slug === 'home' ? 'Homepage' : 'Naamloze pagina')}
                        {page.slug !== 'home' && (
                          <ExternalLink
                            className="ms-1 inline size-3"
                            aria-label="Open in Payload"
                          />
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={page._status === 'published' ? 'secondary' : 'outline'}>
                        {page._status === 'published' ? 'Gepubliceerd' : 'Concept'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(page.updatedAt).toLocaleDateString('nl-NL', {
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
                    render={<Link href={localized + '&page=' + list.prevPage} />}
                  >
                    Vorige
                  </Button>
                )}
                {list.hasNextPage && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={localized + '&page=' + list.nextPage} />}
                  >
                    Volgende
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        !document && (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>
                  {section === 'pages'
                    ? 'Geen pagina’s gevonden'
                    : 'Geen website-instellingen gevonden'}
                </EmptyTitle>
                <EmptyDescription>
                  Je kunt het eerste document aanmaken in Payload.
                </EmptyDescription>
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<a href={'/admin/collections/' + section} />}
                >
                  Open Payload
                </Button>
              </EmptyHeader>
            </Empty>
          </Card>
        )
      )}
    </section>
  )
}

function documentID(value: string) {
  return /^\d+$/.test(value) ? Number(value) : undefined
}

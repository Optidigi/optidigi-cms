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
import { Input } from '@/components/ui/input'
import {
  adminRoot,
  currentSite,
  editorialSections,
  findEditorialDocument,
  type EditorialSection,
} from '@/admin-comparison/data'
import { Editor } from '@/admin-comparison/editor'
import { previewURL, siteLocale } from '@/site/preview'
import { isPlatformAdmin, relationID } from '@/site/access'

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; section: string }>
  searchParams: Promise<{ locale?: string; id?: string; page?: string; new?: string; q?: string }>
}) {
  const { site, section: value } = await params
  if (!Object.hasOwn(editorialSections, value)) notFound()
  const section = value as EditorialSection
  const query = await searchParams
  const locale = siteLocale(query.locale) ?? 'nl'
  const { req, selected } = await currentSite(site)
  const root = adminRoot + '/' + selected.id + '/' + section
  const localized = root + '?locale=' + locale
  const isSettings = section === 'site-settings'
  const id = relationID(query.id)
  if (query.id && !id) notFound()
  const document =
    isSettings || id
      ? await findEditorialDocument(req, selected.id, locale, section, id)
      : undefined
  if (id && !document) notFound()
  const editing = Boolean(document || query.new === '1' || isSettings)
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 150) : ''
  const options = {
    req,
    locale,
    overrideAccess: false as const,
    depth: 0 as const,
    fallbackLocale: false as const,
  }
  const pageNumber = /^\d+$/.test(query.page ?? '')
    ? Math.max(1, Math.min(10000, Number(query.page)))
    : 1
  const list =
    !isSettings && !editing
      ? await req.payload.find({
          ...options,
          collection: section,
          draft: true,
          limit: 20,
          page: pageNumber,
          sort: '-updatedAt',
          where: {
            tenant: { equals: selected.id },
            ...(search ? { title: { contains: search } } : {}),
          },
          select: { slug: true, title: true, _status: true, updatedAt: true },
        })
      : undefined
  const supportedPreview = section === 'pages' || section === 'site-settings'
  const [preview, versions] = await Promise.all([
    document && supportedPreview ? previewURL(section, document.id, locale, req) : null,
    document
      ? req.payload
          .findVersions({
            ...options,
            collection: section,
            where: { parent: { equals: document.id } },
            limit: 6,
            sort: '-updatedAt',
          })
          .then(({ docs }) => docs.map(({ id, updatedAt }) => ({ id, updatedAt })))
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
      : editorialSections[section]
    : editorialSections[section]
  const suffix = document && !isSettings ? '&id=' + document.id : query.new ? '&new=1' : ''

  return (
    <section className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {editing && !isSettings && (
            <Link href={localized} className="text-sm text-muted-foreground hover:underline">
              {editorialSections[section]}
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{selected.name}</p>
        </div>
        <nav aria-label="Inhoudstaal" className="flex items-center gap-2">
          {(['nl', 'en'] as const).map((code) => (
            <Button
              key={code}
              variant={code === locale ? 'secondary' : 'ghost'}
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={root + '?locale=' + code + suffix}
                  aria-current={code === locale ? 'page' : undefined}
                />
              }
            >
              {code === 'nl' ? 'Nederlands' : 'English'}
            </Button>
          ))}
        </nav>
      </header>
      {editing ? (
        <Editor
          key={section + locale + (document?.id ?? 'new')}
          document={document ?? {}}
          {...{ locale, section, versions, preview, canDelete }}
          site={selected.id}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form action={root} className="flex items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <Input
                type="search"
                name="q"
                aria-label="Zoek op titel"
                placeholder="Zoek op titel"
                defaultValue={search}
                maxLength={150}
              />
              <Button variant="outline" type="submit">
                Zoeken
              </Button>
            </form>
            <Button nativeButton={false} render={<Link href={localized + '&new=1'} />}>
              <Plus /> Nieuw document
            </Button>
          </div>
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
                    {list.docs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Link
                            href={localized + '&id=' + doc.id}
                            className="font-medium hover:underline"
                          >
                            {doc.title || (doc.slug === 'home' ? 'Homepage' : 'Naamloos document')}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc._status === 'published' ? 'secondary' : 'outline'}>
                            {doc._status === 'published' ? 'Gepubliceerd' : 'Concept'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.updatedAt).toLocaleDateString('nl-NL', {
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
                              '&q=' +
                              encodeURIComponent(search) +
                              '&page=' +
                              list.prevPage
                            }
                          />
                        }
                      >
                        Vorige
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
                              '&q=' +
                              encodeURIComponent(search) +
                              '&page=' +
                              list.nextPage
                            }
                          />
                        }
                      >
                        Volgende
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
                  <EmptyTitle>{search ? 'Geen resultaten' : 'Nog geen documenten'}</EmptyTitle>
                  {search && <EmptyDescription>Probeer een andere titel.</EmptyDescription>}
                </EmptyHeader>
              </Empty>
            </Card>
          )}
        </>
      )}
    </section>
  )
}

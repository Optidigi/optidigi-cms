import { find } from '@/admin/data'
import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Images, Plus } from 'lucide-react'
import { MediaForm } from '@/admin/media'
import { adminRoot, currentSite } from '@/admin/data'
import { isPlatformAdmin, relationID } from '@/site/access'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'

function imagePath(value?: string | null) {
  if (!value) return undefined
  try {
    const path = new URL(value, 'https://cms.invalid').pathname
    return path.startsWith('/api/media/file/') ? path : undefined
  } catch {
    return undefined
  }
}

export default async function MediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ id?: string; new?: string; page?: string; q?: string }>
}) {
  const t = await adminTranslations()

  const { req, selected } = await currentSite((await params).site)
  const query = await searchParams
  const id = relationID(query.id)
  if (query.id && !id) notFound()
  const base = adminRoot + '/' + selected.id + '/media'
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 150) : ''
  const editing = Boolean(id || query.new === '1')
  const where = { tenant: { equals: selected.id } }
  const options = {
    collection: 'media' as const,
    depth: 0 as const,
  }
  const media = id
    ? (await find({ ...options, limit: 1, where: { ...where, id: { equals: id } } }))
        .docs[0]
    : undefined
  if (id && !media) notFound()
  const results = !editing
    ? await find({
        ...options,
        page: relationID(query.page) ?? 1,
        limit: 20,
        sort: '-updatedAt',
        where: {
          ...where,
          ...(search
            ? { or: [{ filename: { contains: search } }, { alt: { contains: search } }] }
            : {}),
        },
      })
    : undefined
  const canDelete =
    isPlatformAdmin(req.user) ||
    Boolean(
      req.user?.tenants?.some(
        (entry) => entry.role === 'admin' && relationID(entry.tenant) === selected.id,
      ),
    )
  const url = imagePath(media?.url)

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {editing && (
            <Link href={base} className="text-sm text-muted-foreground hover:underline">
              Media
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {media?.filename || (editing ? t('Nieuwe afbeelding') : 'Media')}
          </h1>
          <p className="text-sm text-muted-foreground">{selected.name}</p>
        </div>
        {!editing && (
          <Button nativeButton={false} render={<Link href={base + '?new=1'} />}>
            <Plus />
            {t('Afbeelding toevoegen')}
          </Button>
        )}
      </header>
      {editing ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <MediaForm
            key={media?.id ?? 'new'}
            media={media}
            site={selected.id}
            canDelete={canDelete}
          />
          {url && media && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Bestand')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Image
                  src={url}
                  alt={media.alt}
                  width={media.width ?? 660}
                  height={media.height ?? 460}
                  unoptimized
                  className="max-h-96 w-full rounded-md object-contain"
                />
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={url} target="_blank" rel="noreferrer" />}
                >
                  {t('Open origineel')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          <form action={base} className="flex gap-2">
            <Input
              type="search"
              name="q"
              aria-label={t('Zoek afbeelding')}
              placeholder={t('Zoek op bestandsnaam of alternatieve tekst')}
              defaultValue={search}
              maxLength={150}
            />
            <Button type="submit" variant="outline">
              {t('Zoeken')}
            </Button>
          </form>
          {results?.docs.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {results.docs.map((item) => {
                const href = imagePath(item.url)
                return (
                  <Card key={item.id}>
                    <CardContent className="space-y-2">
                      {href && (
                        <Image
                          alt={item.alt}
                          src={href}
                          unoptimized
                          width={item.width ?? 320}
                          height={item.height ?? 200}
                          className="h-32 w-full rounded-md object-cover"
                        />
                      )}
                      <Link
                        className="block truncate text-sm font-medium hover:underline"
                        href={base + '?id=' + item.id}
                      >
                        {item.filename || item.alt}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{item.alt}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Images />
                  </EmptyMedia>
                  <EmptyTitle>
                    {search ? t('Geen afbeeldingen gevonden') : t('Nog geen afbeeldingen')}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </Card>
          )}
          <div className="flex gap-2">
            {results?.hasPrevPage && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={base + '?q=' + encodeURIComponent(search) + '&page=' + results.prevPage}
                  />
                }
              >
                {t('Vorige')}
              </Button>
            )}
            {results?.hasNextPage && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={base + '?q=' + encodeURIComponent(search) + '&page=' + results.nextPage}
                  />
                }
              >
                {t('Volgende')}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

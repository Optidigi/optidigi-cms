import { comparisonTranslations, getContentLanguage } from '@/admin-comparison/i18n-server'
import Link from 'next/link'
import { ArrowUpRight, ChevronRight, FilePlus2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { currentSite } from '@/admin-comparison/data'
import { contentLinks, siteHref } from '@/admin-comparison/navigation'

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const t = await comparisonTranslations()

  const { selected, req } = await currentSite((await params).site)
  const locale = await getContentLanguage((await searchParams).locale)
  const base = siteHref(selected.id)
  const options = {
    req,
    overrideAccess: false as const,
    depth: 0 as const,
    limit: 3,
    sort: '-updatedAt',
    where: { tenant: { equals: selected.id } },
  }
  const content = await Promise.all(
    contentLinks.map(async (entry) => {
      if (entry.slug === 'media') {
        const { totalDocs, docs } = await req.payload.find({
          ...options,
          collection: entry.slug,
          select: { filename: true, alt: true, updatedAt: true },
        })
        return {
          ...entry,
          totalDocs,
          recent: docs.map(({ id, filename, alt, updatedAt }) => ({
            id,
            title: filename || alt,
            updatedAt,
            href: base + '/media?id=' + id,
            status: null,
          })),
        }
      }
      const { totalDocs, docs } = await req.payload.find({
        ...options,
        collection: entry.slug,
        locale,
        draft: true,
        fallbackLocale: false,
        select: { title: true, updatedAt: true, _status: true },
      })
      return {
        ...entry,
        totalDocs,
        recent: docs.map(({ id, title, updatedAt, _status }) => ({
          id,
          title: title || t('Naamloos document'),
          updatedAt,
          href: base + '/' + entry.slug + '?locale=' + locale + '&id=' + id,
          status: _status,
        })),
      }
    }),
  )
  const recent = content
    .flatMap(({ recent, title, Icon }) =>
      recent.map((doc) => ({
        ...doc,
        section: title,
        Icon,
      })),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
  const dateFormat = new Intl.DateTimeFormat(t('nl-NL'), {
    dateStyle: 'medium',
    timeZone: 'Europe/Amsterdam',
  })

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="break-words text-2xl font-semibold tracking-tight">{selected.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('Websiteoverzicht')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={selected.siteOrigin}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t('Bekijk website')}
            <ArrowUpRight />
          </Link>
          <Link
            href={base + '/pages?locale=' + locale + '&new=1'}
            className={buttonVariants({ size: 'sm' })}
          >
            <FilePlus2 />
            {t('Nieuwe pagina')}
          </Link>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {content.map(({ slug, title, totalDocs, Icon }) => (
          <Link
            key={slug}
            href={siteHref(selected.id, '/' + slug, locale)}
            className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  {title}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{totalDocs}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t('Laatst gewijzigd')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length ? (
            <ul className="space-y-2">
              {recent.map(({ href, title, updatedAt, status, section, Icon }) => (
                <li key={href}>
                  <Item variant="outline" render={<Link href={href} />}>
                    <ItemMedia variant="icon">
                      <Icon />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="min-w-0 break-all">{title}</ItemTitle>
                      <ItemDescription>
                        {section} ·{' '}
                        <time dateTime={updatedAt}>{dateFormat.format(new Date(updatedAt))}</time>
                      </ItemDescription>
                    </ItemContent>
                    {status && (
                      <Badge variant={status === 'draft' ? 'outline' : 'secondary'}>
                        {status === 'draft' ? t('Concept') : t('Gepubliceerd')}
                      </Badge>
                    )}
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </Item>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('Opgeslagen documenten en uploads verschijnen hier.')}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

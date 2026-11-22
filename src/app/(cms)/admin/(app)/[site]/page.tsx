import { ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { HomePrompt } from '@/cms/assistant/home-prompt'
import { EditsChart } from '@/cms/content/edits-chart'
import { formatDate, StatusBadge } from '@/cms/content/status-badge'
import { getLanguage, getTranslator, requireSite } from '@/cms/server'
import { enabledSections, sections, type Section } from '@/cms/sections'
import { PageBody } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'
import { isPlatformAdmin } from '@/site/access'

type Entry = { section: Section; id: number; title?: string | null; status?: string | null; updatedAt: string }

const chartDays = 30
const day = (date: Date) => date.toISOString().slice(0, 10)

// The website's start page: the large AI prompt, how much content there is, saves over the last
// 30 days (from Payload's own version history) and the latest edits.
export default async function OverviewPage({ params }: { params: Promise<{ site: string }> }) {
  const [{ payload, user, site }, t, language] = await Promise.all([
    requireSite((await params).site),
    getTranslator(),
    getLanguage(),
  ])
  const tenant = { tenant: { equals: site.id } }
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (chartDays - 1))

  const [lists, media] = await Promise.all([
    Promise.all(
      enabledSections(site).map(async (section) => {
        const collection = sections[section].collection
        const [latest, drafts, versions] = await Promise.all([
          payload.find({
            collection, depth: 0, draft: true, limit: 6, overrideAccess: false, user, sort: '-updatedAt', where: tenant,
            select: { title: true, _status: true, updatedAt: true },
          }),
          payload.find({
            collection, depth: 0, draft: true, limit: 1, overrideAccess: false, user, select: {},
            where: { and: [tenant, { _status: { not_equals: 'published' } }] },
          }),
          payload.findVersions({
            collection, depth: 0, limit: 2000, pagination: false, overrideAccess: false, user, select: { updatedAt: true },
            where: { and: [{ 'version.tenant': { equals: site.id } }, { updatedAt: { greater_than_equal: since.toISOString() } }] },
          }),
        ])
        return {
          section,
          total: latest.totalDocs,
          drafts: drafts.totalDocs,
          saves: versions.docs.map(({ updatedAt }) => day(new Date(updatedAt))),
          docs: latest.docs.map(({ id, title, _status, updatedAt }): Entry => ({ section, id, title, status: _status, updatedAt })),
        }
      }),
    ),
    payload.count({ collection: 'media', overrideAccess: false, user, where: tenant }),
  ])

  const recent = lists
    .flatMap(({ docs }) => docs)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
  const saves = lists.flatMap(({ saves }) => saves)
  const days = Array.from({ length: chartDays }, (_, index) => {
    const date = new Date(since)
    date.setUTCDate(since.getUTCDate() + index)
    const key = day(date)
    return { date: key, edits: saves.filter((value) => value === key).length }
  })

  const stats = [
    ...lists.map(({ section, total, drafts }) => ({
      key: section,
      label: t(sections[section].label),
      value: total,
      note: drafts ? t('unpublishedCount', { count: drafts }) : t('allPublished'),
      href: `/admin/${site.id}/${section}`,
    })),
    { key: 'media', label: t('media'), value: media.totalDocs, note: t('mediaNote'), href: `/admin/${site.id}/media` },
  ]

  return (
    <>
      <SiteHeader crumbs={[{ label: site.name }, { label: t('overview') }]} />
      <PageBody className="@container">
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4 md:py-8">
          <HomePrompt platformAdmin={isPlatformAdmin(user)}>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{t('homeTitle')}</h1>
              <p className="text-sm text-muted-foreground">
                {site.name} ·{' '}
                <a href={site.siteOrigin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                  {t('viewWebsite')}
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              </p>
            </div>
          </HomePrompt>
        </section>

        <div className={cn('grid grid-cols-2 gap-4', stats.length === 3 && '@xl:grid-cols-3', stats.length === 4 && '@3xl:grid-cols-4')}>
          {stats.map((stat) => (
            <Card key={stat.key} size="sm">
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  <Link href={stat.href} className="hover:underline">
                    {stat.value}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{stat.note}</CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 @3xl:grid-cols-5">
          <Card className="@3xl:col-span-3">
            <CardHeader>
              <CardTitle>{t('editsTitle')}</CardTitle>
              <CardDescription>{t('editsDescription', { count: saves.length })}</CardDescription>
            </CardHeader>
            <CardContent>
              <EditsChart days={days} />
            </CardContent>
          </Card>
          <Card className="@3xl:col-span-2">
            <CardHeader>
              <CardTitle>{t('recentEdits')}</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length ? (
                <ItemGroup className="gap-1">
                  {recent.map((entry) => (
                    <Item key={`${entry.section}-${entry.id}`} size="sm" render={<Link href={`/admin/${site.id}/${entry.section}/${entry.id}`} />}>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="w-full truncate">{entry.title || t('untitled')}</ItemTitle>
                        <ItemDescription className="truncate">
                          {t(sections[entry.section].label)} · {formatDate(entry.updatedAt, language)}
                        </ItemDescription>
                      </ItemContent>
                      <StatusBadge status={entry.status} t={t} />
                    </Item>
                  ))}
                </ItemGroup>
              ) : (
                <p className="text-sm text-muted-foreground">{t('nothingHere')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

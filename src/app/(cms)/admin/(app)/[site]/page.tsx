import { BotIcon, ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { formatDate, StatusBadge } from '@/cms/content/status-badge'
import { getLanguage, getTranslator, requireSite } from '@/cms/server'
import { sections, type Section } from '@/cms/sections'
import { PageBody, PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

type Entry = { section: Section; id: number; title?: string | null; status?: string | null; updatedAt: string }

export default async function OverviewPage({ params }: { params: Promise<{ site: string }> }) {
  const [{ payload, user, site }, t, language] = await Promise.all([
    requireSite((await params).site),
    getTranslator(),
    getLanguage(),
  ])
  const lists = await Promise.all(
    (Object.keys(sections) as Section[]).map(async (section) => {
      const { docs, totalDocs } = await payload.find({
        collection: sections[section].collection,
        depth: 0,
        draft: true,
        limit: 8,
        overrideAccess: false,
        select: { title: true, _status: true, updatedAt: true },
        sort: '-updatedAt',
        user,
        where: { tenant: { equals: site.id } },
      })
      return {
        section,
        total: totalDocs,
        docs: docs.map(({ id, title, _status, updatedAt }): Entry => ({ section, id, title, status: _status, updatedAt })),
      }
    }),
  )
  const all = lists.flatMap(({ docs }) => docs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const drafts = all.filter(({ status }) => status !== 'published').slice(0, 6)
  const recent = all.slice(0, 6)

  const list = (entries: Entry[]) =>
    entries.length ? (
      <ItemGroup className="gap-2">
        {entries.map((entry) => (
          <Item key={`${entry.section}-${entry.id}`} variant="outline" size="sm" render={<Link href={`/admin/${site.id}/${entry.section}/${entry.id}`} />}>
            <ItemContent className="min-w-0">
              <ItemTitle className="truncate">{entry.title || t('untitled')}</ItemTitle>
              <ItemDescription>
                {t(sections[entry.section].label)} · {formatDate(entry.updatedAt, language)}
              </ItemDescription>
            </ItemContent>
            <StatusBadge status={entry.status} t={t} />
          </Item>
        ))}
      </ItemGroup>
    ) : (
      <p className="text-sm text-muted-foreground">{t('nothingHere')}</p>
    )

  return (
    <>
      <SiteHeader crumbs={[{ label: site.name }, { label: t('overview') }]} />
      <PageBody>
        <PageTitle
          title={site.name}
          description={t('overviewDescription')}
          actions={
            <>
              <a href={site.siteOrigin} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
                <ExternalLinkIcon data-icon="inline-start" />
                {t('openWebsite')}
              </a>
              <Link href={`/admin/${site.id}/assistant`} className={buttonVariants()}>
                <BotIcon data-icon="inline-start" />
                {t('askAssistant')}
              </Link>
            </>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {lists.map(({ section, total }) => (
            <Card key={section} size="sm">
              <CardHeader>
                <CardDescription>{t(sections[section].label)}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  <Link href={`/admin/${site.id}/${section}`} className="hover:underline">
                    {total}
                  </Link>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('drafts')}</CardTitle>
              <CardDescription>{t('draftsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>{list(drafts)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('recentEdits')}</CardTitle>
            </CardHeader>
            <CardContent>{list(recent)}</CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

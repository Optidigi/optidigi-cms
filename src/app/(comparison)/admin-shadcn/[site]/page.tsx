import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, FileText, Images, Newspaper } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { adminRoot, currentSite } from '@/admin-comparison/data'

const catalog = [
  { collection: 'pages', title: 'Pagina’s', Icon: FileText },
  { collection: 'articles', title: 'Artikelen', Icon: Newspaper },
  { collection: 'projects', title: 'Portfolio', Icon: BriefcaseBusiness },
  { collection: 'media', title: 'Media', Icon: Images },
] as const

export default async function SitePage({ params }: { params: Promise<{ site: string }> }) {
  const { selected, req } = await currentSite((await params).site)
  const stats = await Promise.all(
    catalog.map(async (entry) => {
      const { totalDocs } = await req.payload.count({
        collection: entry.collection,
        req,
        overrideAccess: false,
        where: { tenant: { equals: selected.id } },
      })
      return { ...entry, totalDocs }
    }),
  )
  const base = adminRoot + '/' + selected.id

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{selected.name}</h1>
          <p className="text-sm text-muted-foreground">Websiteoverzicht</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={base + '/settings'} />}>
          Instellingen
        </Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ collection, title, totalDocs, Icon }) => (
          <Card key={collection}>
            <CardHeader>
              <CardDescription>
                <Icon className="mr-2 inline size-4" />
                {title}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totalDocs}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href={base + '/' + collection} />}
              >
                Open {title.toLowerCase()} <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

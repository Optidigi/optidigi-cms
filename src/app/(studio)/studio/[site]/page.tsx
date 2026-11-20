import { ArrowUpRight, Monitor } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHomepage, listSites, studioRequest } from '@/studio/data'
import { assistantMemberships } from '@/assistant/scope-shared'
import { createHomepage, restoreHomepage } from '@/studio/actions'
import { HomepageEditor } from '@/studio/homepage-editor'
import { PreviewFrame } from '@/studio/preview-frame'
import { StudioShell } from '@/studio/shell'
import { StudioChat } from '@/studio/chat'
import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Badge } from '@/studio/ui/badge'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/studio/ui/card'
import { previewURL, siteLocale } from '@/site/preview'

const notices = {
  conflict:
    'Deze pagina is intussen gewijzigd. Controleer de nieuwste versie voordat je opnieuw opslaat.',
  restored: 'De vorige versie is als concept teruggezet.',
  failed: 'Opslaan mislukt. Controleer je rechten of probeer het opnieuw.',
  saved: 'Concept opgeslagen.',
  published: 'Homepage gepubliceerd.',
}

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ locale?: string; result?: string }>
}) {
  const { site } = await params
  const query = await searchParams
  const locale = siteLocale(query.locale) ?? 'nl'
  const req = await studioRequest()
  const sites = await listSites(req)
  const active = sites.find(({ id }) => String(id) === site)
  if (!active) notFound()
  const page = await getHomepage(req, active.id, locale)
  const preview = page ? await previewURL('pages', page.id, locale, req) : null
  const versions = page
    ? (
        await req.payload.findVersions({
          collection: 'pages',
          where: { parent: { equals: page.id } },
          req,
          overrideAccess: false,
          depth: 0,
          limit: 8,
          sort: '-updatedAt',
        })
      ).docs
    : []
  const result =
    query.result && Object.hasOwn(notices, query.result)
      ? (query.result as keyof typeof notices)
      : undefined

  return (
    <StudioShell sites={sites} active={active.id}>
      <div className="mx-auto max-w-screen-2xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link className="text-sm text-muted-foreground hover:underline" href="/studio">
              Websites
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Homepage</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['nl', 'en'] as const).map((code) => (
              <Button key={code} variant={locale === code ? 'secondary' : 'ghost'} asChild>
                <Link
                  href={'/studio/' + site + '?locale=' + code}
                  aria-current={locale === code ? 'page' : undefined}
                >
                  {code === 'nl' ? 'Nederlands' : 'English'}
                </Link>
              </Button>
            ))}
            <Button variant="outline" asChild>
              <a href={active.siteOrigin} target="_blank" rel="noreferrer">
                Live website <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </header>
        {result && (
          <Alert
            className="mb-4"
            variant={result === 'conflict' || result === 'failed' ? 'destructive' : 'default'}
          >
            <AlertDescription>{notices[result]}</AlertDescription>
          </Alert>
        )}
        {page ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Inhoud</CardTitle>
                  <Badge variant="secondary">
                    {page._status === 'published' ? 'Gepubliceerd' : 'Concept'}
                  </Badge>
                </div>
                <CardDescription>Wijzig de kop en intro van de homepage.</CardDescription>
              </CardHeader>
              <CardContent>
                <HomepageEditor
                  key={site + locale + page.updatedAt}
                  site={active.id}
                  locale={locale}
                  initial={page}
                />
                {versions.length > 0 && (
                  <details className="mt-5 border-t pt-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Versiegeschiedenis
                    </summary>
                    <ul className="mt-3 grid gap-2">
                      {versions.map((version) => (
                        <li
                          key={version.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <time dateTime={version.updatedAt}>
                            {new Date(version.updatedAt).toLocaleString('nl-NL', {
                              timeZone: 'Europe/Amsterdam',
                            })}
                          </time>
                          <form action={restoreHomepage}>
                            <input type="hidden" name="site" value={site} />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="version" value={version.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Herstel als concept
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor aria-hidden="true" className="size-4" /> Voorbeeld
                </CardTitle>
                <CardDescription>Toont de laatst opgeslagen versie voor deze taal.</CardDescription>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <PreviewFrame src={preview} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Voorbeeld is voor deze website of taal nog niet beschikbaar.
                  </p>
                )}
              </CardContent>
            </Card>
            {assistantMemberships(req.user).some(({ id }) => id === active.id) && (
              <div className="xl:col-span-2">
                <StudioChat
                  key={site + locale}
                  site={active.id}
                  documentID={page.id}
                  locale={locale}
                  canManage={assistantMemberships(req.user).some(
                    ({ id, canManage }) => id === active.id && canManage,
                  )}
                />
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Homepage toevoegen</CardTitle>
              <CardDescription>Voor deze website is nog geen homepage ingesteld.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createHomepage}>
                <input type="hidden" name="site" value={site} />
                <Button type="submit">Maak homepageconcept</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </StudioShell>
  )
}

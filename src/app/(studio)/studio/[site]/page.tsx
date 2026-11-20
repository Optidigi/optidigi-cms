import { ArrowUpRight, Monitor } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHomepage, listSites, studioRequest } from '@/studio/data'
import { saveHomepage } from '@/studio/actions'
import { StudioShell } from '@/studio/shell'
import { StudioChat } from '@/studio/chat'
import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Badge } from '@/studio/ui/badge'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/studio/ui/card'
import { Input } from '@/studio/ui/input'
import { Label } from '@/studio/ui/label'
import { Textarea } from '@/studio/ui/textarea'
import { previewURL, siteLocale } from '@/site/preview'

const notices = {
  conflict:
    'Deze pagina is intussen gewijzigd. Controleer de nieuwste versie voordat je opnieuw opslaat.',
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
  const preview = page && locale === 'nl' ? await previewURL('pages', page.id, locale, req) : null
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
                <form action={saveHomepage} className="grid gap-4" key={page.updatedAt + locale}>
                  <input type="hidden" name="site" value={site} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="revision" value={page.updatedAt} />
                  <div className="grid gap-2">
                    <Label htmlFor="heading">Kop</Label>
                    <Input
                      id="heading"
                      name="heading"
                      defaultValue={page.heading ?? ''}
                      maxLength={200}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Intro</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={page.description ?? ''}
                      maxLength={1000}
                      rows={5}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="intent" value="draft" variant="outline">
                      Concept opslaan
                    </Button>
                    <Button type="submit" name="intent" value="publish" disabled={locale !== 'nl'}>
                      Publiceren
                    </Button>
                  </div>
                </form>
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
                  <iframe
                    className="h-[28rem] w-full rounded-lg border bg-white"
                    title="Homepagevoorbeeld"
                    src={preview}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Voorbeeld is voor deze website of taal nog niet beschikbaar.
                  </p>
                )}
              </CardContent>
            </Card>
            {locale === 'nl' && (
              <div className="xl:col-span-2">
                <StudioChat key={site} site={active.id} documentID={page.id} />
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertDescription>Voor deze website is nog geen homepage ingesteld.</AlertDescription>
          </Alert>
        )}
      </div>
    </StudioShell>
  )
}

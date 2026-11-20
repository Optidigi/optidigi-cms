import { ArrowRight, FileImage, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sections, isStudioSection } from '@/studio/content'
import { NavigationFields } from '@/studio/navigation-fields'
import { getPlainBody } from '@/studio/plain-body'
import { saveStudioContent } from '@/studio/content-actions'
import { listSites, studioRequest } from '@/studio/data'
import { StudioShell } from '@/studio/shell'
import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Badge } from '@/studio/ui/badge'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/studio/ui/card'
import { Input } from '@/studio/ui/input'
import { Label } from '@/studio/ui/label'
import { Textarea } from '@/studio/ui/textarea'
import { isPlatformAdmin } from '@/site/access'

type Fields = {
  id: number
  name?: string
  title?: string
  heading?: string | null
  description?: string | null
  slug?: string
  alt?: string
  filename?: string | null
  url?: string | null
  contactEmail?: string | null
  phone?: string | null
  navigation?: { label: string; href: string }[] | null
  body?: unknown
  seo?: { title?: string | null; description?: string | null }
  _status?: string | null
}

function TextField({
  name,
  label,
  value,
  required = false,
}: {
  name: string
  label: string
  value?: string | null
  required?: boolean
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input name={name} id={name} defaultValue={value ?? ''} required={required} />
    </div>
  )
}

function LongField({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea name={name} id={name} defaultValue={value ?? ''} rows={4} />
    </div>
  )
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string; collection: string }>
  searchParams: Promise<{
    id?: string
    locale?: string
    page?: string
    result?: string
    new?: string
  }>
}) {
  const { site, collection } = await params
  if (!isStudioSection(collection)) notFound()
  const query = await searchParams
  const locale: 'nl' | 'en' = query.locale === 'en' ? 'en' : 'nl'
  const index = Math.max(1, Number(query.page) || 1)
  const req = await studioRequest()
  const sites = await listSites(req)
  const active = sites.find(({ id }) => String(id) === site)
  if (!active) notFound()
  const options = {
    collection,
    req,
    overrideAccess: false as const,
    depth: 0 as const,
    locale,
    fallbackLocale: false as const,
    draft: collection !== 'media',
  }
  const result = await req.payload.find({
    ...options,
    where: { tenant: { equals: active.id } },
    page: index,
    limit: 20,
    sort: '-updatedAt',
  })
  const records = result.docs as Fields[]
  const isSettings = collection === 'site-settings'
  const isMedia = collection === 'media'
  const selected = query.id
    ? ((
        await req.payload.find({
          ...options,
          where: { id: { equals: query.id }, tenant: { equals: active.id } },
          limit: 1,
        })
      ).docs[0] as Fields | undefined)
    : isSettings
      ? records[0]
      : undefined
  if (query.id && !selected) notFound()
  const plainBody = getPlainBody(selected?.body)
  const editing = selected || query.new === '1' || isSettings
  const route = '/studio/' + site + '/content/' + collection
  const href = (suffix = '') => route + '?locale=' + locale + suffix
  const canDelete =
    isPlatformAdmin(req.user) ||
    Boolean(
      req.user?.tenants?.some(
        (membership) =>
          (typeof membership.tenant === 'object' ? membership.tenant.id : membership.tenant) ===
            active.id && membership.role === 'admin',
      ),
    )

  return (
    <StudioShell sites={sites} active={active.id}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{active.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{sections[collection]}</h1>
          </div>
          <div className="flex gap-2">
            {!isMedia && (
              <Button variant="outline" asChild>
                <Link href={route + '?locale=' + (locale === 'nl' ? 'en' : 'nl')}>
                  {locale === 'nl' ? 'English' : 'Nederlands'}
                </Link>
              </Button>
            )}
            {!isSettings && (
              <Button asChild>
                <Link href={href('&new=1')}>
                  <Plus aria-hidden="true" /> {isMedia ? 'Uploaden' : 'Nieuw'}
                </Link>
              </Button>
            )}
          </div>
        </header>
        {query.result && (
          <Alert className="mb-4" variant={query.result === 'failed' ? 'destructive' : 'default'}>
            <AlertDescription>
              {query.result === 'failed'
                ? 'De wijziging kon niet worden opgeslagen.'
                : query.result === 'deleted'
                  ? 'Verwijderd.'
                  : 'Opgeslagen.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.25fr)]">
          {!isSettings && (
            <Card>
              <CardHeader>
                <CardTitle>Overzicht</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {!records.length && (
                  <p className="text-sm text-muted-foreground">Nog geen items.</p>
                )}
                {records.map((doc) => (
                  <Button
                    variant={doc.id === selected?.id ? 'secondary' : 'ghost'}
                    asChild
                    key={doc.id}
                    className="justify-between"
                  >
                    <Link
                      href={
                        collection === 'pages' && doc.slug === 'home'
                          ? '/studio/' + site + '?locale=' + locale
                          : href('&id=' + doc.id)
                      }
                    >
                      <span className="truncate">
                        {doc.title ?? doc.filename ?? doc.alt ?? 'Zonder titel'}
                      </span>
                      {doc._status ? (
                        <Badge variant="secondary">
                          {doc._status === 'published' ? 'Gepubliceerd' : 'Concept'}
                        </Badge>
                      ) : (
                        <ArrowRight aria-hidden="true" />
                      )}
                    </Link>
                  </Button>
                ))}
                <div className="flex gap-2">
                  {result.hasPrevPage && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={href('&page=' + result.prevPage)}>Vorige</Link>
                    </Button>
                  )}
                  {result.hasNextPage && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={href('&page=' + result.nextPage)}>Volgende</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {editing && (
            <Card className={isSettings ? 'lg:col-span-2' : undefined}>
              <CardHeader>
                <CardTitle>{selected ? 'Bewerken' : 'Nieuw item'}</CardTitle>
              </CardHeader>
              <CardContent>
                {isMedia && selected?.url && selected.filename && (
                  <Button className="mb-4" variant="outline" asChild>
                    <a href={selected.url} target="_blank" rel="noreferrer">
                      <FileImage aria-hidden="true" />
                      {selected.filename}
                    </a>
                  </Button>
                )}
                <form action={saveStudioContent} className="grid gap-4" key={selected?.id ?? 'new'}>
                  <input type="hidden" name="site" value={site} />
                  <input type="hidden" name="collection" value={collection} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={selected?.id ?? ''} />
                  {isMedia ? (
                    <>
                      {!selected && (
                        <div className="grid gap-2">
                          <Label htmlFor="file">Afbeelding</Label>
                          <Input
                            id="file"
                            type="file"
                            name="file"
                            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                            required
                          />
                        </div>
                      )}
                      <TextField
                        name="alt"
                        label="Alternatieve tekst"
                        value={selected?.alt}
                        required
                      />
                    </>
                  ) : isSettings ? (
                    <>
                      <TextField name="name" label="Websitenaam" value={selected?.name} required />
                      <TextField
                        name="contactEmail"
                        label="Contact e-mailadres"
                        value={selected?.contactEmail}
                      />
                      <TextField name="phone" label="Telefoonnummer" value={selected?.phone} />
                      <NavigationFields
                        key={selected?.id ?? 'new'}
                        initial={selected?.navigation ?? []}
                      />
                    </>
                  ) : (
                    <>
                      <TextField name="title" label="Titel" value={selected?.title} required />
                      <TextField name="slug" label="URL-segment" value={selected?.slug} required />
                      <TextField name="heading" label="Kop" value={selected?.heading} />
                      <LongField name="description" label="Intro" value={selected?.description} />
                      {plainBody === null ? (
                        <p className="text-sm text-muted-foreground">
                          Deze inhoud bevat opmaak of blokken. Je kunt de overige velden wijzigen
                          zonder die inhoud aan te passen.
                        </p>
                      ) : (
                        <LongField name="body" label="Inhoud" value={plainBody} />
                      )}
                    </>
                  )}
                  {!isMedia && (
                    <>
                      <TextField name="seoTitle" label="SEO-titel" value={selected?.seo?.title} />
                      <LongField
                        name="seoDescription"
                        label="SEO-beschrijving"
                        value={selected?.seo?.description}
                      />
                    </>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      name="intent"
                      value="save"
                      variant={isMedia ? 'default' : 'outline'}
                    >
                      {isMedia ? 'Opslaan' : 'Concept opslaan'}
                    </Button>
                    {!isMedia && (
                      <Button type="submit" name="intent" value="publish">
                        Publiceren
                      </Button>
                    )}
                  </div>
                </form>
                {selected && canDelete && !isSettings && (
                  <details className="mt-5 border-t pt-4">
                    <summary className="cursor-pointer text-sm text-destructive">
                      Item verwijderen
                    </summary>
                    <form action={saveStudioContent} className="mt-3">
                      <input type="hidden" name="site" value={site} />
                      <input type="hidden" name="collection" value={collection} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={selected.id} />
                      <Button type="submit" variant="destructive" name="intent" value="delete">
                        Verwijderen bevestigen
                      </Button>
                    </form>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StudioShell>
  )
}

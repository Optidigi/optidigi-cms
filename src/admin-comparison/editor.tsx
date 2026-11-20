'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, ExternalLink, History, Plus, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveComparison, type SaveResult } from './actions'
import type { EditorialSection } from './data'

type Document = {
  id: number
  updatedAt: string
  _status?: 'draft' | 'published' | null
  title?: string | null
  heading?: string | null
  description?: string | null
  name?: string
  contactEmail?: string | null
  phone?: string | null
  navigation?: { label: string; href: string; id?: string | null }[] | null
  seo?: { title?: string | null; description?: string | null } | null
}

const notices: Record<SaveResult, string> = {
  saved: 'Concept opgeslagen.',
  published: 'Gepubliceerd.',
  restored: 'Vorige versie als concept opgeslagen.',
  conflict: 'Het document is intussen gewijzigd. Je invoer staat nog in het formulier.',
  invalid: 'Controleer de verplichte velden en de linkpaden.',
  failed: 'Opslaan is mislukt. Controleer je toegang of probeer opnieuw.',
}

export function Editor({
  document,
  site,
  section,
  locale,
  preview,
  versions,
}: {
  document: Document
  site: number
  section: EditorialSection
  locale: 'nl' | 'en'
  preview: string | null
  versions: { id: string; updatedAt: string }[]
}) {
  const router = useRouter()
  const [pending, run] = useTransition()
  const [completion, setCompletion] = useState<SaveResult>()
  const [links, setLinks] = useState(() =>
    (document.navigation ?? []).map((link, index) => ({
      ...link,
      key: link.id || String(index),
    })),
  )
  const homepage = section === 'pages'
  const native = '/admin/collections/' + section + '/' + document.id
  const failed = completion === 'conflict' || completion === 'invalid' || completion === 'failed'

  function save(form: FormData, intent: string, version?: string) {
    form.set('site', String(site))
    form.set('id', String(document.id))
    form.set('revision', document.updatedAt)
    form.set('section', section)
    form.set('locale', locale)
    form.set('intent', intent)
    if (version) form.set('version', String(version))
    run(async () => {
      const result = await saveComparison(form)
      setCompletion(result)
      if (result === 'saved' || result === 'published' || result === 'restored') router.refresh()
    })
  }

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle role="heading" aria-level={2}>
            {homepage ? 'Homepage bewerken' : 'Website-instellingen bewerken'}
          </CardTitle>
          <Badge variant="secondary">
            {document._status === 'published' ? 'Gepubliceerd' : 'Concept'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {completion && (
            <Alert variant={failed ? 'destructive' : 'default'} role="status">
              {failed && <CircleAlert />}
              <AlertDescription>{notices[completion]}</AlertDescription>
            </Alert>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const button = (event.nativeEvent as SubmitEvent).submitter
              save(new FormData(event.currentTarget), button?.getAttribute('value') ?? 'draft')
            }}
          >
            <FieldGroup key={document.updatedAt}>
              {homepage ? (
                <>
                  <TextField id="title" label="Titel" required value={document.title} />
                  <TextField
                    id="heading"
                    label="Paginakop"
                    value={document.heading}
                    maxLength={200}
                  />
                  <TextField
                    id="description"
                    label="Intro"
                    value={document.description}
                    multiline
                    maxLength={1000}
                  />
                  <FieldDescription>
                    Open het document in Payload om opgemaakte inhoud te bewerken.
                  </FieldDescription>
                </>
              ) : (
                <>
                  <TextField id="name" label="Websitenaam" value={document.name} required />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="contactEmail"
                      label="Contactmail"
                      type="email"
                      value={document.contactEmail}
                    />
                    <TextField id="phone" label="Telefoonnummer" value={document.phone} />
                  </div>
                  <Field>
                    <FieldLabel>Websitenavigatie</FieldLabel>
                    {links.map((link, index) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
                        key={link.key}
                      >
                        <Input
                          name="navLabel"
                          aria-label={'Linktekst ' + (index + 1)}
                          placeholder="Linktekst"
                          required
                          value={link.label}
                          onChange={(event) =>
                            setLinks(
                              links.map((item) =>
                                item.key === link.key
                                  ? { ...item, label: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Input
                          name="navHref"
                          aria-label={'Pad ' + (index + 1)}
                          placeholder="/contact"
                          required
                          value={link.href}
                          onChange={(event) =>
                            setLinks(
                              links.map((item) =>
                                item.key === link.key
                                  ? { ...item, href: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={'Verwijder link ' + (index + 1)}
                          onClick={() => setLinks(links.filter((item) => item.key !== link.key))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <Button
                      className="self-start"
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLinks([...links, { key: crypto.randomUUID(), label: '', href: '' }])
                      }
                    >
                      <Plus /> Link toevoegen
                    </Button>
                  </Field>
                </>
              )}
              <TextField
                id="seoTitle"
                label="SEO-titel"
                value={document.seo?.title}
                maxLength={200}
              />
              <TextField
                id="seoDescription"
                label="SEO-beschrijving"
                value={document.seo?.description}
                multiline
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" value="draft" variant="outline" disabled={pending}>
                  Concept opslaan
                </Button>
                <Button type="submit" value="publish" disabled={pending}>
                  Publiceren
                </Button>
                <Button variant="ghost" nativeButton={false} render={<a href={native} />}>
                  Open in Payload <ExternalLink />
                </Button>
              </div>
            </FieldGroup>
          </form>
          {versions.length > 0 && (
            <Collapsible className="border-t pt-3">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                <History /> Versiegeschiedenis
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <time dateTime={version.updatedAt}>
                      {new Date(version.updatedAt).toLocaleString('nl-NL', {
                        timeZone: 'Europe/Amsterdam',
                      })}
                    </time>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => save(new FormData(), 'restore', version.id)}
                    >
                      Herstel als concept
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          {completion === 'conflict' && (
            <Button variant="outline" onClick={() => router.refresh()}>
              Laad nieuwste versie
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle role="heading" aria-level={2}>
            Websitevoorbeeld
          </CardTitle>
          {preview && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={preview} target="_blank" rel="noreferrer" />}
            >
              Open in nieuw tabblad <ExternalLink />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {preview ? (
            <iframe
              key={document.updatedAt}
              src={preview}
              title="Websitevoorbeeld"
              className="h-[34rem] w-full rounded-md border bg-white"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Voorbeeld is voor deze website nog niet beschikbaar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  required,
  multiline,
  maxLength,
  type = 'text',
}: {
  id: string
  label: string
  value?: string | null
  required?: boolean
  multiline?: boolean
  maxLength?: number
  type?: string
}) {
  const props = { id, name: id, defaultValue: value ?? '', required, maxLength }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? <Textarea {...props} rows={3} /> : <Input {...props} type={type} />}
    </Field>
  )
}

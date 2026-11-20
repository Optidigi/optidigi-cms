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
import type { Page } from '@/payload-types'
import { editableBody } from './rich-text-data'
import { RichTextEditor } from './rich-text'

type Document = {
  id?: number
  updatedAt?: string
  _status?: 'draft' | 'published' | null
  title?: string | null
  slug?: string
  body?: Page['body']
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
  deleted: 'Document verwijderd.',
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
  canDelete,
}: {
  document: Document
  site: number
  section: EditorialSection
  locale: 'nl' | 'en'
  preview: string | null
  versions: { id: string; updatedAt: string }[]
  canDelete: boolean
}) {
  const router = useRouter()
  const [pending, run] = useTransition()
  const [completion, setCompletion] = useState<SaveResult>()
  const isSettings = section === 'site-settings'
  const homepage = section === 'pages' && document.slug === 'home'
  const supportsPreview = Boolean(document.id && (homepage || isSettings))
  const native = '/admin/collections/' + section + '/' + document.id
  const base = '/admin-shadcn/' + site + '/' + section
  const [body, setBody] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const failed = completion === 'conflict' || completion === 'invalid' || completion === 'failed'

  function save(form: FormData, intent: string, version?: string) {
    form.set('site', String(site))
    if (document.id) form.set('id', String(document.id))
    if (document.updatedAt) form.set('revision', document.updatedAt)
    if (body !== undefined && (intent === 'draft' || intent === 'publish')) form.set('body', body)
    form.set('section', section)
    form.set('locale', locale)
    form.set('intent', intent)
    if (version) form.set('version', String(version))
    run(async () => {
      const { result, id } = await saveComparison(form)
      setCompletion(result)
      if (result === 'deleted') router.replace(base + '?locale=' + locale)
      else if (id && !document.id)
        router.replace(base + '?locale=' + locale + (isSettings ? '' : '&id=' + id))
      else if (result === 'saved' || result === 'published' || result === 'restored') {
        setBody(undefined)
        router.refresh()
      }
    })
  }

  return (
    <div
      className={supportsPreview ? 'grid min-w-0 items-start gap-4 xl:grid-cols-2' : 'max-w-3xl'}
    >
      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle role="heading" aria-level={2}>
            {isSettings
              ? 'Website-instellingen bewerken'
              : homepage
                ? 'Homepage bewerken'
                : document.id
                  ? 'Document bewerken'
                  : 'Document aanmaken'}
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
              {!isSettings ? (
                <>
                  <TextField id="title" label="Titel" required value={document.title} />
                  <Field>
                    <FieldLabel htmlFor="slug">URL-naam</FieldLabel>
                    <Input
                      id="slug"
                      name="slug"
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      defaultValue={document.slug ?? ''}
                      readOnly={homepage}
                      maxLength={150}
                    />
                  </Field>
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
                  <Field>
                    <FieldLabel>Inhoud</FieldLabel>
                    {!document.body || editableBody(document.body) ? (
                      <RichTextEditor value={document.body} onChange={setBody} />
                    ) : (
                      <FieldDescription>
                        Open dit document in Payload om de bestaande opmaak te bewerken.
                      </FieldDescription>
                    )}
                  </Field>
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
                  <NavigationFields navigation={document.navigation} />
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
                {document.id && (
                  <Button variant="ghost" nativeButton={false} render={<Link href={native} />}>
                    Open in Payload <ExternalLink />
                  </Button>
                )}
                {canDelete && document.id && !homepage && !isSettings && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 /> Verwijderen
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
          {confirmDelete && (
            <Alert variant="destructive">
              <AlertDescription>Wil je dit document definitief verwijderen?</AlertDescription>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Annuleren
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => save(new FormData(), 'delete')}
                >
                  Verwijderen bevestigen
                </Button>
              </div>
            </Alert>
          )}
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
      {supportsPreview && (
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
      )}
    </div>
  )
}

function NavigationFields({ navigation }: { navigation: Document['navigation'] }) {
  const [links, setLinks] = useState(() =>
    (navigation ?? []).map((link, index) => ({
      ...link,
      key: link.id || String(index),
    })),
  )
  return (
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
                  item.key === link.key ? { ...item, label: event.target.value } : item,
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
                  item.key === link.key ? { ...item, href: event.target.value } : item,
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
        onClick={() => setLinks([...links, { key: crypto.randomUUID(), label: '', href: '' }])}
      >
        <Plus /> Link toevoegen
      </Button>
    </Field>
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

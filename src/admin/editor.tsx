'use client'

import { useAdminTranslations, useEditingGuard } from '@/admin/i18n-context'

import Link from 'next/link'
import { useHydrated } from '@/hooks/use-hydrated'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleAlert, ExternalLink, History, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { saveEditorial, type SaveResult } from './actions'
import type { EditorialSection } from './data'
import type { Page } from '@/payload-types'
import { editableBody } from '@/site/admin/rich-text-data'
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
  const ready = useHydrated()
  const t = useAdminTranslations()

  const { markDirty, canNavigate } = useEditingGuard()
  useEffect(() => () => markDirty(false), [markDirty])
  const router = useRouter()
  const [pending, run] = useTransition()
  const [completion, setCompletion] = useState<SaveResult>()
  const isSettings = section === 'site-settings'
  const homepage = section === 'pages' && document.slug === 'home'
  const supportsPreview = Boolean(document.id && (homepage || isSettings))
  const base = '/admin/' + site + '/' + section
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
      const { result, id } = await saveEditorial(form)
      setCompletion(result)
      if (
        result === 'deleted' ||
        result === 'saved' ||
        result === 'published' ||
        result === 'restored'
      )
        markDirty(false)
      if (result === 'deleted') router.replace(base + '?locale=' + locale)
      else if (id && !document.id)
        router.replace(base + '?locale=' + locale + (isSettings ? '' : '&id=' + id))
      else if (result === 'saved' || result === 'published' || result === 'restored') {
        setBody(undefined)
        router.refresh()
      }
    })
  }

  const requestedPanel = useSearchParams().get('panel')
  const panel =
    document.id && (requestedPanel === 'navigation' || requestedPanel === 'seo')
      ? requestedPanel
      : 'website'
  const seoFields = (
    <div className="space-y-4">
      <TextField id="seoTitle" label={t('SEO-titel')} value={document.seo?.title} maxLength={200} />
      <TextField
        id="seoDescription"
        label={t('SEO-beschrijving')}
        value={document.seo?.description}
        multiline
        maxLength={500}
      />
    </div>
  )
  return (
    <div
      className={supportsPreview ? 'grid min-w-0 items-start gap-4 xl:grid-cols-2' : 'max-w-3xl'}
    >
      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle role="heading" aria-level={2}>
            {isSettings
              ? t('Website-instellingen bewerken')
              : homepage
                ? t('Homepage bewerken')
                : document.id
                  ? t('Document bewerken')
                  : t('Document aanmaken')}
          </CardTitle>
          <Badge variant="secondary">
            {document._status === 'published' ? t('Gepubliceerd') : t('Concept')}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {completion && (
            <Alert variant={failed ? 'destructive' : 'default'} role="status">
              {failed && <CircleAlert />}
              <AlertDescription>{t(notices[completion])}</AlertDescription>
            </Alert>
          )}
          <Field className="max-w-xs">
            <FieldLabel htmlFor="document-translation">{t('Documentvertaling')}</FieldLabel>
            <NativeSelect
              id="document-translation"
              value={locale}
              disabled={pending || !ready}
              onChange={(event) => {
                if (!canNavigate(t('Niet-opgeslagen wijzigingen verlaten?'))) return
                const destination = new URL(window.location.href)
                destination.searchParams.set('locale', event.target.value)
                router.push(destination.pathname + destination.search)
              }}
            >
              <NativeSelectOption value="nl">Nederlands</NativeSelectOption>
              <NativeSelectOption value="en">English</NativeSelectOption>
            </NativeSelect>
          </Field>
          <form
            onChange={() => markDirty(true)}
            onSubmit={(event) => {
              event.preventDefault()
              const button = (event.nativeEvent as SubmitEvent).submitter
              save(new FormData(event.currentTarget), button?.getAttribute('value') ?? 'draft')
            }}
          >
            <fieldset disabled={!ready} className="min-w-0">
              <FieldGroup key={document.updatedAt}>
                {!isSettings ? (
                  <>
                    <TextField id="title" label={t('Titel')} required value={document.title} />
                    <Field>
                      <FieldLabel htmlFor="slug">{t('URL-naam')}</FieldLabel>
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
                      label={t('Paginakop')}
                      value={document.heading}
                      maxLength={200}
                    />
                    <TextField
                      id="description"
                      label={t('Intro')}
                      value={document.description}
                      multiline
                      maxLength={1000}
                    />
                    <Field>
                      <FieldLabel>{t('Inhoud')}</FieldLabel>
                      {!document.body || editableBody(document.body) ? (
                        <RichTextEditor
                          value={document.body}
                          onChange={(value) => {
                            setBody(value)
                            markDirty(true)
                          }}
                        />
                      ) : (
                        <FieldDescription>
                          {t('Deze opmaak kan hier niet worden bewerkt en blijft bewaard.')}
                        </FieldDescription>
                      )}
                    </Field>
                  </>
                ) : (
                  <>
                    <Tabs
                      value={panel}
                      onValueChange={(value) => {
                        const url = new URL(window.location.href)
                        if (value === 'website') url.searchParams.delete('panel')
                        else url.searchParams.set('panel', String(value))
                        window.history.pushState(null, '', url)
                      }}
                    >
                      <TabsList variant="line" aria-label={t('Website-instellingen')}>
                        <TabsTrigger value="website">{t('Algemeen')}</TabsTrigger>
                        <TabsTrigger value="navigation" disabled={!document.id}>
                          {t('Navigatie')}
                        </TabsTrigger>
                        <TabsTrigger value="seo" disabled={!document.id}>
                          SEO
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent keepMounted value="website" className="space-y-4 pt-4">
                        <TextField
                          id="name"
                          label={t('Websitenaam')}
                          value={document.name}
                          required
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField
                            id="contactEmail"
                            label={t('Contactmail')}
                            type="email"
                            value={document.contactEmail}
                          />
                          <TextField
                            id="phone"
                            label={t('Telefoonnummer')}
                            value={document.phone}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent keepMounted value="navigation" className="pt-4">
                        <NavigationFields navigation={document.navigation} />
                      </TabsContent>
                      <TabsContent keepMounted value="seo" className="pt-4">
                        {seoFields}
                      </TabsContent>
                    </Tabs>
                  </>
                )}
                {!isSettings && seoFields}
                <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap gap-2 border-t bg-card py-3 md:bottom-0">
                  <Button type="submit" value="draft" variant="outline" disabled={pending}>
                    {t('Concept opslaan')}
                  </Button>
                  <Button type="submit" value="publish" disabled={pending}>
                    {t('Publiceren')}
                  </Button>
                  {canDelete && document.id && !homepage && !isSettings && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 />
                      {t('Verwijderen')}
                    </Button>
                  )}
                </div>
              </FieldGroup>
            </fieldset>
          </form>
          {confirmDelete && (
            <Alert variant="destructive">
              <AlertDescription>
                {t('Wil je dit document definitief verwijderen?')}
              </AlertDescription>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                  {t('Annuleren')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => save(new FormData(), 'delete')}
                >
                  {t('Verwijderen bevestigen')}
                </Button>
              </div>
            </Alert>
          )}
          {versions.length > 0 && (
            <Collapsible className="border-t pt-3">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                <History />
                {t('Versiegeschiedenis')}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <time dateTime={version.updatedAt}>
                      {new Date(version.updatedAt).toLocaleString(t('nl-NL'), {
                        timeZone: 'Europe/Amsterdam',
                      })}
                    </time>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => save(new FormData(), 'restore', version.id)}
                    >
                      {t('Herstel als concept')}
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          {completion === 'conflict' && (
            <Button variant="outline" onClick={() => router.refresh()}>
              {t('Laad nieuwste versie')}
            </Button>
          )}
        </CardContent>
      </Card>
      {supportsPreview && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle role="heading" aria-level={2}>
              {t('Websitevoorbeeld')}
            </CardTitle>
            {preview && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href={preview} target="_blank" rel="noreferrer" />}
              >
                {t('Open in nieuw tabblad')}
                <ExternalLink />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {preview ? (
              <iframe
                key={document.updatedAt}
                src={preview}
                title={t('Websitevoorbeeld')}
                className="h-[34rem] w-full rounded-md border bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('Voorbeeld is voor deze website nog niet beschikbaar.')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function NavigationFields({ navigation }: { navigation: Document['navigation'] }) {
  const t = useAdminTranslations()

  const [links, setLinks] = useState(() =>
    (navigation ?? []).map((link, index) => ({
      ...link,
      key: link.id || String(index),
    })),
  )
  return (
    <Field>
      <FieldLabel>{t('Websitenavigatie')}</FieldLabel>
      {links.map((link, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
          key={link.key}
        >
          <Input
            name="navLabel"
            aria-label={t('Linktekst ') + (index + 1)}
            placeholder={t('Linktekst')}
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
            aria-label={t('Pad ') + (index + 1)}
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
            aria-label={t('Verwijder link ') + (index + 1)}
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
        <Plus />
        {t('Link toevoegen')}
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

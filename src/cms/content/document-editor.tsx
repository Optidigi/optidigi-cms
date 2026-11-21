'use client'

import { CheckIcon, EllipsisIcon, ExternalLinkIcon, EyeIcon, HistoryIcon, LockIcon, Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { api, APIError, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useMediaQuery } from '../client/use-media-query'
import type { MessageKey } from '../i18n'
import { AssistantBottomBar, AssistantPageContext } from '../assistant/assistant-context'
import { AskButton } from '../assistant/assistant-panel'
import { RichTextEditor } from '../editor/rich-text'
import type { ContentLocale, EditorialCollection, Section } from '../sections'
import { DeleteDialog } from './delete-dialog'
import { LivePreview } from './live-preview'
import { StatusBadge, formatDate } from './status-badge'
import { useDocumentLock } from './use-document-lock'

export type EditorDocument = {
  id: number
  title: string
  slug: string
  heading: string
  description: string
  body: unknown
  seo: { title: string; description: string }
  status: string
  updatedAt: string
}

type Values = Omit<EditorDocument, 'id' | 'status' | 'updatedAt'>

const empty: Values = { title: '', slug: '', heading: '', description: '', body: null, seo: { title: '', description: '' } }

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

// Form fields by the path Payload uses in validation errors, for labels and focus.
const fieldInputs: Record<string, { id: string; label: MessageKey }> = {
  title: { id: 'title', label: 'title' },
  slug: { id: 'slug', label: 'slug' },
  heading: { id: 'heading', label: 'heading' },
  description: { id: 'description', label: 'description' },
  body: { id: 'body', label: 'body' },
  'seo.title': { id: 'seo-title', label: 'seoTitle' },
  'seo.description': { id: 'seo-description', label: 'seoDescription' },
}

type Saved = { status: string; updatedAt: string }

export function DocumentEditor({
  site,
  section,
  collection,
  locale,
  language,
  userID,
  document,
  versions,
  lock,
  previewHref,
  previewOpen,
}: {
  site: number
  section: Section
  collection: EditorialCollection
  locale: ContentLocale
  language: string
  userID: number
  document?: EditorDocument
  versions: { id: string; updatedAt: string; status?: string | null }[]
  lock?: { email?: string }
  previewHref: string | null
  previewOpen: boolean
}) {
  const { t } = useI18n()
  const router = useRouter()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [values, setValues] = useState<Values>(document ?? empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'draft' | 'publish'>()
  const [autosave, setAutosave] = useState<'saving' | 'saved' | 'error'>()
  const [saved, setSaved] = useState<Saved | undefined>(document && { status: document.status, updatedAt: document.updatedAt })
  const [previewRevision, setPreviewRevision] = useState(0)
  const [previewSheet, setPreviewSheet] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string>()
  const slugTouched = useRef(Boolean(document?.slug))
  // Counts edits, so an autosave that finishes after newer typing doesn't mark the form clean.
  const revision = useRef(0)
  // Saves run one after another: a manual save waits for a running autosave.
  const pending = useRef<Promise<unknown>>(Promise.resolve())
  const listHref = `/admin/${site}/${section}?locale=${locale}`
  const editorHref = (next: { locale?: ContentLocale; preview?: boolean } = {}) =>
    `/admin/${site}/${section}/${document?.id ?? 'new'}${query({
      locale: next.locale ?? locale,
      preview: (next.preview ?? previewOpen) ? 1 : undefined,
    })}`
  const { lockedByOther, takeOver, relock } = useDocumentLock({ collection, id: document?.id, userID, lockedByOther: Boolean(lock) })
  const split = previewOpen && wide && Boolean(previewHref)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    // Client-side navigation doesn't fire beforeunload, so ask before following in-app links.
    const intercept = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a[href]')
      if (!anchor || anchor.getAttribute('target') === '_blank' || event.metaKey || event.ctrlKey) return
      const url = new URL(anchor.getAttribute('href')!, window.location.href)
      if (url.origin !== window.location.origin) return
      event.preventDefault()
      event.stopPropagation()
      setLeaveTo(url.pathname + url.search)
    }
    window.document.addEventListener('click', intercept, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      window.document.removeEventListener('click', intercept, true)
    }
  }, [dirty])

  // Payload-native autosave: shortly after editing stops, the draft is saved with `autosave=true`
  // (the collections enable versions.drafts.autosave). Published content stays as it is until Publish.
  const hasErrors = Object.values(errors).some(Boolean)
  useEffect(() => {
    // Field errors from a failed save stay until the field is edited, so autosave waits for them.
    if (!dirty || !document || lockedByOther || saving || hasErrors) return
    const edit = revision.current
    const timer = setTimeout(() => {
      setAutosave('saving')
      // Payload removes the lock on every save; taking it back is part of the same queued step.
      const run = pending.current.then(async () => {
        const result = await api<{ doc: { updatedAt: string } }>(
          `${collection}/${document.id}${query({ depth: 0, locale, draft: true, autosave: true })}`,
          { method: 'PATCH', json: { ...values, _status: 'draft' } },
        )
        await relock()
        return result
      })
      pending.current = run.catch(() => undefined)
      run.then(
        ({ doc }) => {
          if (revision.current === edit) setDirty(false)
          setSaved({ status: 'draft', updatedAt: doc.updatedAt })
          setAutosave('saved')
          setPreviewRevision((current) => current + 1)
        },
        (error) => {
          setAutosave('error')
          if (error instanceof APIError) setErrors(error.fields)
        },
      )
    }, 1500)
    return () => clearTimeout(timer)
  }, [dirty, values, document, lockedByOther, saving, hasErrors, collection, locale, relock])

  function change<K extends keyof Values>(key: K, value: Values[K]) {
    revision.current++
    setValues((current) => {
      const next = { ...current, [key]: value }
      if (key === 'title' && !slugTouched.current) next.slug = slugify(String(value))
      return next
    })
    setDirty(true)
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  async function save(intent: 'draft' | 'publish') {
    setSaving(intent)
    setErrors({})
    const data = {
      ...values,
      _status: intent === 'publish' ? 'published' : 'draft',
      ...(document ? {} : { tenant: site }),
    }
    const params = query({
      depth: 0,
      locale,
      draft: intent === 'draft' ? true : undefined,
    })
    try {
      const run = pending.current.then(async () => {
        const response = await api<{ doc: { id: number; _status?: string; updatedAt: string } }>(
          document ? `${collection}/${document.id}${params}` : `${collection}${params}`,
          { method: document ? 'PATCH' : 'POST', json: data },
        )
        if (document) await relock()
        return response
      })
      pending.current = run.catch(() => undefined)
      const result = await run
      setDirty(false)
      toast.success(intent === 'publish' ? t('publishedToast') : t('saved'))
      if (document) {
        setSaved({ status: result.doc._status ?? (intent === 'publish' ? 'published' : 'draft'), updatedAt: result.doc.updatedAt })
        setPreviewRevision((current) => current + 1)
        router.refresh()
      } else {
        router.replace(`/admin/${site}/${section}/${result.doc.id}?locale=${locale}`)
      }
    } catch (error) {
      if (error instanceof APIError) {
        setErrors(error.fields)
        const invalid = Object.keys(error.fields).filter((path) => fieldInputs[path])
        if (invalid.length) window.document.getElementById(fieldInputs[invalid[0]].id)?.focus()
        toast.error(
          error.status === 423
            ? t('lockedBySomeone')
            : invalid.length
              ? t('saveFailedFields', { fields: invalid.map((path) => t(fieldInputs[path].label)).join(', ') })
              : t('saveFailed'),
        )
      } else {
        toast.error(t('saveFailed'))
      }
    }
    setSaving(undefined)
  }

  function navigate(href: string) {
    if (dirty) setLeaveTo(href)
    else router.push(href)
  }

  // The preview grant lasts 30 minutes; re-render the page for a fresh one while the preview is open.
  useEffect(() => {
    if (!previewOpen && !previewSheet) return
    const timer = setInterval(() => router.refresh(), 25 * 60_000)
    return () => clearInterval(timer)
  }, [previewOpen, previewSheet, router])

  function togglePreview() {
    if (!wide) return setPreviewSheet(true)
    router.replace(editorHref({ preview: !previewOpen }), { scroll: false })
  }

  const disabled = lockedByOther || Boolean(saving)
  const field = (key: string) => (errors[key] ? { 'data-invalid': true } : {})
  // Nothing to publish when the published version is the latest and nothing changed since.
  const upToDate = saved?.status === 'published' && !dirty

  const saveButtons = (compact: boolean) => (
    <>
      <Button variant="outline" disabled={disabled} onClick={() => save('draft')}>
        {saving === 'draft' && <Spinner data-icon="inline-start" />}
        {t('saveDraft')}
      </Button>
      <Button disabled={disabled || upToDate} onClick={() => save('publish')}>
        {saving === 'publish' && <Spinner data-icon="inline-start" />}
        {upToDate && !saving && <CheckIcon data-icon="inline-start" />}
        {upToDate ? (compact || !saved ? t('publishedState') : t('publishedAt', { time: formatTime(saved.updatedAt, language) })) : t('publish')}
      </Button>
    </>
  )

  const autosaveNote =
    autosave === 'saving' ? t('autosaving') : autosave === 'error' ? t('autosaveFailed') : autosave === 'saved' && saved ? t('autosaved', { time: formatTime(saved.updatedAt, language) }) : dirty ? t('unsavedChanges') : undefined

  // The "⋯" menu of the compact action bar: everything from the details card.
  const moreMenu = document && (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={t('more')} />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {previewHref && (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={togglePreview}>
              <EyeIcon />
              {split ? t('closePreview') : t('livePreview')}
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href={previewHref} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon />
              {t('openInNewTab')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('documentTranslation')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={locale} onValueChange={(value) => value !== locale && navigate(editorHref({ locale: value as ContentLocale }))}>
            <DropdownMenuRadioItem value="nl">{t('dutch')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en">{t('english')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={lockedByOther} onClick={() => setVersionsOpen(true)}>
            <HistoryIcon />
            {t('versions')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={lockedByOther} onClick={() => setDeleting(true)}>
            <Trash2Icon />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Sticky bar at the bottom of the form: on small screens, and beside the live preview.
  const actionBar = (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:-mx-6',
        !split && 'lg:hidden',
      )}
    >
      <AskButton />
      {moreMenu}
      <span className="sr-only" aria-live="polite">
        {autosaveNote}
      </span>
      <div className="ml-auto flex gap-2">{saveButtons(true)}</div>
    </div>
  )

  const form = (
    <div className="flex min-w-0 flex-col gap-6">
      {document && <AssistantPageContext value={{ collection, id: document.id, title: document.title }} />}
      {split ? <AssistantBottomBar always /> : <AssistantBottomBar />}
      {/* The details card is beside the form only on wide screens without the preview. */}
      {saved && (
        <div className={cn('flex flex-wrap items-center gap-2 text-sm text-muted-foreground', !split && 'lg:hidden')}>
          <StatusBadge status={saved.status} t={t} hint />
          <span>{autosaveNote ?? `${t('updated')}: ${formatDate(saved.updatedAt, language)}`}</span>
        </div>
      )}
      {lockedByOther && (
        <Alert>
          <LockIcon />
          <AlertTitle>{lock?.email ? t('lockedBy', { email: lock.email }) : t('lockedBySomeone')}</AlertTitle>
          <AlertDescription>{t('lockedDescription')}</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" onClick={takeOver}>
              {t('takeOver')}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {/* While someone else edits, the form is read-only. */}
      {/* While someone else edits, or while a save runs, the form is read-only. */}
      <fieldset disabled={lockedByOther || Boolean(saving)} className="contents">
        <Card>
          <CardContent>
            <FieldGroup>
              <Field {...field('title')}>
                <FieldLabel htmlFor="title">{t('title')}</FieldLabel>
                <Input id="title" value={values.title} required aria-invalid={Boolean(errors.title) || undefined} onChange={(event) => change('title', event.target.value)} />
                <FieldError>{errors.title}</FieldError>
              </Field>
              <Field {...field('slug')}>
                <FieldLabel htmlFor="slug">{t('slug')}</FieldLabel>
                <Input
                  id="slug"
                  value={values.slug}
                  required
                  aria-invalid={Boolean(errors.slug) || undefined}
                  onChange={(event) => {
                    slugTouched.current = true
                    change('slug', event.target.value)
                  }}
                />
                <FieldDescription>{t('slugHint')}</FieldDescription>
                <FieldError>{errors.slug}</FieldError>
              </Field>
              <Field {...field('heading')}>
                <FieldLabel htmlFor="heading">{t('heading')}</FieldLabel>
                <Input id="heading" value={values.heading} aria-invalid={Boolean(errors.heading) || undefined} onChange={(event) => change('heading', event.target.value)} />
                <FieldDescription>{t('headingHint')}</FieldDescription>
                <FieldError>{errors.heading}</FieldError>
              </Field>
              <Field {...field('description')}>
                <FieldLabel htmlFor="description">{t('description')}</FieldLabel>
                <Textarea id="description" value={values.description} aria-invalid={Boolean(errors.description) || undefined} onChange={(event) => change('description', event.target.value)} />
                <FieldDescription>{t('descriptionHint')}</FieldDescription>
                <FieldError>{errors.description}</FieldError>
              </Field>
              <Field {...field('body')}>
                <FieldLabel htmlFor="body">{t('body')}</FieldLabel>
                <RichTextEditor id="body" label={t('body')} site={site} editable={!lockedByOther && !saving} value={values.body} onChange={(value) => change('body', value)} />
                <FieldError>{errors.body}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>{t('seo')}</FieldLegend>
              <FieldDescription>{t('seoHint')}</FieldDescription>
              <FieldGroup>
                <Field {...field('seo.title')}>
                  <FieldLabel htmlFor="seo-title">{t('seoTitle')}</FieldLabel>
                  <Input id="seo-title" value={values.seo.title} onChange={(event) => change('seo', { ...values.seo, title: event.target.value })} />
                  <FieldError>{errors['seo.title']}</FieldError>
                </Field>
                <Field {...field('seo.description')}>
                  <FieldLabel htmlFor="seo-description">{t('seoDescription')}</FieldLabel>
                  <Textarea id="seo-description" value={values.seo.description} onChange={(event) => change('seo', { ...values.seo, description: event.target.value })} />
                  <FieldError>{errors['seo.description']}</FieldError>
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>
      </fieldset>
      {actionBar}
    </div>
  )

  const details = (
    <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:flex lg:self-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            {t('details')}
            {saved && <StatusBadge status={saved.status} t={t} hint />}
          </CardTitle>
          {saved && <CardDescription>{t('updated')}: {formatDate(saved.updatedAt, language)}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel>{t('documentTranslation')}</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[locale]}
              aria-label={t('documentTranslation')}
              onValueChange={(value) => {
                const next = value[0] as ContentLocale | undefined
                if (next && next !== locale) navigate(editorHref({ locale: next }))
              }}
            >
              <ToggleGroupItem value="nl">{t('dutch')}</ToggleGroupItem>
              <ToggleGroupItem value="en">{t('english')}</ToggleGroupItem>
            </ToggleGroup>
            {autosaveNote && <FieldDescription aria-live="polite">{autosaveNote}</FieldDescription>}
          </Field>
          <div className="grid gap-2">{saveButtons(false)}</div>
          <FieldDescription>{t('publishAllHint')}</FieldDescription>
          {document && (
            <div className="grid gap-2">
              {previewHref && (
                <Button variant="ghost" className="justify-start" onClick={togglePreview}>
                  <EyeIcon data-icon="inline-start" />
                  {t('livePreview')}
                </Button>
              )}
              <Button variant="ghost" className="justify-start" disabled={lockedByOther} onClick={() => setVersionsOpen(true)}>
                <HistoryIcon data-icon="inline-start" />
                {t('versions')}
              </Button>
              <Button variant="ghost" className="justify-start text-destructive" disabled={lockedByOther} onClick={() => setDeleting(true)}>
                <Trash2Icon data-icon="inline-start" />
                {t('delete')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  )

  return (
    <>
      {split && previewHref ? (
        <ResizablePanelGroup orientation="horizontal" className="h-[calc(100svh-4rem)] min-h-0">
          <ResizablePanel defaultSize="45" minSize="30">
            <div className="h-full overflow-y-auto px-4 pt-4 md:px-6 md:pt-6">{form}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize="30">
            <LivePreview key={previewHref} src={previewHref} revision={previewRevision} onClose={togglePreview} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {form}
          {details}
        </div>
      )}

      {previewHref && !wide && (
        <Sheet open={previewSheet} onOpenChange={setPreviewSheet}>
          <SheetContent side="bottom" className="gap-0 p-0 data-[side=bottom]:h-svh" showCloseButton={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>{t('livePreview')}</SheetTitle>
              <SheetDescription>{t('previewHint')}</SheetDescription>
            </SheetHeader>
            <LivePreview key={previewHref} src={previewHref} revision={previewRevision} onClose={() => setPreviewSheet(false)} />
          </SheetContent>
        </Sheet>
      )}

      {document && (
        <VersionsSheet
          onRestored={() => router.replace(`${editorHref()}&restored=${Date.now()}`)}
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          collection={collection}
          versions={versions}
          language={language}
          disabled={lockedByOther}
        />
      )}
      {document && (
        <DeleteDialog
          open={deleting}
          onOpenChange={setDeleting}
          onConfirm={async () => {
            try {
              await api(`${collection}/${document.id}`, { method: 'DELETE' })
              setDirty(false)
              toast.success(t('deleted'))
              router.replace(listHref)
            } catch {
              toast.error(t('deleteFailed'))
            }
            setDeleting(false)
          }}
        />
      )}
      <AlertDialog open={Boolean(leaveTo)} onOpenChange={(open) => !open && setLeaveTo(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('leaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('leaveDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('stay')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const href = leaveTo
                setDirty(false)
                setLeaveTo(undefined)
                if (href) router.push(href)
              }}
            >
              {t('leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatTime(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL', { timeStyle: 'short' }).format(new Date(value))
}

function VersionsSheet({
  onRestored,
  open,
  onOpenChange: setOpen,
  collection,
  versions,
  language,
  disabled,
}: {
  onRestored: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: EditorialCollection
  versions: { id: string; updatedAt: string; status?: string | null }[]
  language: string
  disabled: boolean
}) {
  const { t } = useI18n()
  const [restoring, setRestoring] = useState<string>()

  async function restore(id: string) {
    setRestoring(id)
    try {
      // Payload's native restore, saved as a draft.
      await api(`${collection}/versions/${id}${query({ draft: true, depth: 0 })}`, { method: 'POST' })
      toast.success(t('restored'))
      setOpen(false)
      onRestored()
    } catch {
      toast.error(t('restoreFailed'))
    }
    setRestoring(undefined)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('versions')}</SheetTitle>
          <SheetDescription>{t('versionsDescription')}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {versions.length ? (
            versions.map((version, index) => (
              <Item key={version.id} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{formatDate(version.updatedAt, language)}</ItemTitle>
                  <ItemDescription>
                    <StatusBadge status={version.status} t={t} />
                  </ItemDescription>
                </ItemContent>
                {index > 0 && (
                  <ItemActions>
                    <Button size="sm" variant="outline" disabled={disabled || Boolean(restoring)} onClick={() => restore(version.id)}>
                      {restoring === version.id && <Spinner data-icon="inline-start" />}
                      {t('restore')}
                    </Button>
                  </ItemActions>
                )}
              </Item>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('noVersions')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

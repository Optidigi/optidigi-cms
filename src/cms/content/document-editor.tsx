'use client'

import { ExternalLinkIcon, HistoryIcon, LockIcon, Trash2Icon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api, APIError, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { AssistantPageContext } from '../assistant/assistant-context'
import { RichTextEditor } from '../editor/rich-text'
import type { ContentLocale, EditorialCollection, Section } from '../sections'
import { DeleteDialog } from './delete-dialog'
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
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [values, setValues] = useState<Values>(document ?? empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'draft' | 'publish'>()
  const [deleting, setDeleting] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string>()
  const slugTouched = useRef(Boolean(document?.slug))
  const listHref = `/admin/${site}/${section}?locale=${locale}`
  const { lockedByOther, takeOver, relock } = useDocumentLock({ collection, id: document?.id, userID, lockedByOther: Boolean(lock) })

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

  function change<K extends keyof Values>(key: K, value: Values[K]) {
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
      const result = await api<{ doc: { id: number } }>(document ? `${collection}/${document.id}${params}` : `${collection}${params}`, {
        method: document ? 'PATCH' : 'POST',
        json: data,
      })
      setDirty(false)
      toast.success(intent === 'publish' ? t('publishedToast') : t('saved'))
      if (document) {
        await relock()
        router.refresh()
      }
      else router.replace(`/admin/${site}/${section}/${result.doc.id}?locale=${locale}`)
    } catch (error) {
      if (error instanceof APIError) setErrors(error.fields)
      toast.error(error instanceof APIError && error.status === 423 ? t('lockedBySomeone') : t('saveFailed'))
    }
    setSaving(undefined)
  }

  function navigate(href: string) {
    if (dirty) setLeaveTo(href)
    else router.push(href)
  }

  const disabled = lockedByOther || Boolean(saving)
  const field = (key: string) => (errors[key] ? { 'data-invalid': true } : {})

  const actions = (
    <>
      <Button variant="outline" disabled={disabled} onClick={() => save('draft')}>
        {saving === 'draft' && <Spinner data-icon="inline-start" />}
        {t('saveDraft')}
      </Button>
      <Button disabled={disabled} onClick={() => save('publish')}>
        {saving === 'publish' && <Spinner data-icon="inline-start" />}
        {t('publish')}
      </Button>
    </>
  )

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {document && <AssistantPageContext value={{ collection, id: document.id, title: document.title }} />}
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
        <fieldset disabled={lockedByOther} className="contents">
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
                <FieldError>{errors.slug}</FieldError>
              </Field>
              <Field {...field('heading')}>
                <FieldLabel htmlFor="heading">{t('heading')}</FieldLabel>
                <Input id="heading" value={values.heading} onChange={(event) => change('heading', event.target.value)} />
                <FieldError>{errors.heading}</FieldError>
              </Field>
              <Field {...field('description')}>
                <FieldLabel htmlFor="description">{t('description')}</FieldLabel>
                <Textarea id="description" value={values.description} onChange={(event) => change('description', event.target.value)} />
                <FieldError>{errors.description}</FieldError>
              </Field>
              <Field {...field('body')}>
                <FieldLabel htmlFor="body">{t('body')}</FieldLabel>
                <RichTextEditor id="body" label={t('body')} site={site} editable={!lockedByOther} value={values.body} onChange={(value) => change('body', value)} />
                <FieldError>{errors.body}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>{t('seo')}</FieldLegend>
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
        <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:-mx-6 lg:hidden">{actions}</div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              {t('details')}
              {document && <StatusBadge status={document.status} t={t} />}
            </CardTitle>
            {document && <CardDescription>{t('updated')}: {formatDate(document.updatedAt, language)}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t('documentTranslation')}</FieldLabel>
              <ToggleGroup
                variant="outline"
                value={[locale]}
                aria-label={t('documentTranslation')}
                onValueChange={(value) => {
                  const next = value[0]
                  if (next && next !== locale) {
                    navigate(document ? `/admin/${site}/${section}/${document.id}?locale=${next}` : `/admin/${site}/${section}/new?locale=${next}`)
                  }
                }}
              >
                <ToggleGroupItem value="nl">{t('dutch')}</ToggleGroupItem>
                <ToggleGroupItem value="en">{t('english')}</ToggleGroupItem>
              </ToggleGroup>
              {dirty && <FieldDescription>{t('unsavedChanges')}</FieldDescription>}
            </Field>
            <div className="hidden gap-2 lg:grid">{actions}</div>
            <FieldDescription>{t('publishAllHint')}</FieldDescription>
            {document && (
              <div className="grid gap-2">
                {previewHref && (
                  <Button variant="ghost" className="justify-start" nativeButton={false} render={<a href={previewHref} target="_blank" rel="noreferrer" />}>
                    <ExternalLinkIcon data-icon="inline-start" />
                    {t('preview')}
                  </Button>
                )}
                <VersionsSheet collection={collection} versions={versions} language={language} disabled={lockedByOther} />
                <Button variant="ghost" className="justify-start text-destructive" disabled={lockedByOther} onClick={() => setDeleting(true)}>
                  <Trash2Icon data-icon="inline-start" />
                  {t('delete')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

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
    </div>
  )
}

function VersionsSheet({
  collection,
  versions,
  language,
  disabled,
}: {
  collection: EditorialCollection
  versions: { id: string; updatedAt: string; status?: string | null }[]
  language: string
  disabled: boolean
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [restoring, setRestoring] = useState<string>()

  async function restore(id: string) {
    setRestoring(id)
    try {
      // Payload's native restore, saved as a draft.
      await api(`${collection}/versions/${id}${query({ draft: true, depth: 0 })}`, { method: 'POST' })
      toast.success(t('restored'))
      setOpen(false)
      router.refresh()
    } catch {
      toast.error(t('restoreFailed'))
    }
    setRestoring(undefined)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" className="justify-start" />}>
        <HistoryIcon data-icon="inline-start" />
        {t('versions')}
      </SheetTrigger>
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

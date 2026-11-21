'use client'

import { ChevronDownIcon, FileTextIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CodeBlock, CodeBlockContent } from '@/components/ui/code-block'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { collectionLabels } from '@/site/collection-labels'
import { api, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import type { MessageKey } from '../i18n'
import { toolLabel } from './tool-label'

type Input = { slug?: unknown; id?: unknown; data?: unknown; documents?: unknown; locale?: unknown; draft?: unknown; where?: unknown }

// Tools that write content; they publish unless the model asked for a draft.
const writes = new Set(['updateDocument', 'createDocuments', 'duplicateDocument', 'restoreVersion'])
type Row = { field: string; before?: string; after: string }

const fieldLabels: Record<string, MessageKey> = {
  title: 'title',
  slug: 'slug',
  heading: 'heading',
  description: 'description',
  body: 'body',
  seo: 'seo',
  'seo.title': 'seoTitle',
  'seo.description': 'seoDescription',
  navigation: 'navigation',
  alt: 'altText',
}

// Plain text for a field value; rich text and lists are summarised instead of shown as JSON.
function show(value: unknown, changed: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') return value.length > 160 ? value.slice(0, 160) + '…' : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return changed
}

// One row per changed field; nested groups such as SEO get a row per sub-field.
function rows(data: Record<string, unknown>, before: Record<string, unknown> | undefined, changed: string, prefix = ''): Row[] {
  return Object.entries(data).flatMap(([key, value]) => {
    const path = prefix + key
    const previous = before?.[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && !('root' in value)) {
      return rows(value as Record<string, unknown>, previous as Record<string, unknown> | undefined, changed, path + '.')
    }
    return [{ field: path, before: before ? show(previous, changed) : undefined, after: show(value, changed) }]
  })
}

// The approval request as a sentence with a before/after list, built from the tool input and the
// current document read with the editor's own access. The raw request stays under "Details".
export function ApprovalCard({
  tool,
  input,
  disabled,
  onAnswer,
}: {
  tool: string
  input: unknown
  disabled: boolean
  onAnswer: (approved: boolean) => void
}) {
  const { t, language } = useI18n()
  const { slug, id, data, documents, locale, draft, where } = (input && typeof input === 'object' ? input : {}) as Input
  // The input comes from the model: only known collections and numeric ids are used to read the document.
  const collection = typeof slug === 'string' && Object.hasOwn(collectionLabels, slug) ? slug : undefined
  const documentID = (typeof id === 'number' || typeof id === 'string') && /^\d+$/.test(String(id)) ? String(id) : undefined
  const firstDocument = Array.isArray(documents) ? (documents[0] as { data?: unknown } | undefined)?.data : undefined
  const payloadData = data ?? firstDocument
  const fields = payloadData && typeof payloadData === 'object' && !Array.isArray(payloadData) ? (payloadData as Record<string, unknown>) : undefined
  const publishes = writes.has(tool) && draft !== true
  const bulk = Boolean(where) && id === undefined
  const [current, setCurrent] = useState<{ title?: string; values: Record<string, unknown> } | null>()

  useEffect(() => {
    if (!collection || documentID === undefined || tool !== 'updateDocument') return
    let active = true
    api<Record<string, unknown>>(
      `${collection}/${documentID}${query({ draft: true, depth: 0, locale: typeof locale === 'string' ? locale : undefined })}`,
    ).then(
      (doc) => active && setCurrent({ title: typeof doc.title === 'string' ? doc.title : undefined, values: doc }),
      () => active && setCurrent(null),
    )
    return () => {
      active = false
    }
  }, [collection, documentID, tool, locale])

  const label = (field: string) => (fieldLabels[field] ? t(fieldLabels[field]) : field)
  const changes = fields ? rows(fields, current?.values, t('changedContent')) : []
  const loading = tool === 'updateDocument' && documentID !== undefined && current === undefined

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="flex-wrap">
            {toolLabel(tool, input, 'proposed', t, language)}
            {current?.title && <span className="font-normal text-muted-foreground">“{current.title}”</span>}
          </ItemTitle>
          <p className="text-sm text-muted-foreground">{t('approveDescription')}</p>
        </ItemContent>
      </div>
      {(publishes || bulk) && (
        <Alert variant="destructive" className="py-2">
          <TriangleAlertIcon />
          <AlertDescription>
            {publishes && <p>{t('approvePublishes')}</p>}
            {bulk && <p>{t('approveAllMatching')}</p>}
          </AlertDescription>
        </Alert>
      )}
      {loading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        changes.length > 0 && (
          <dl className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm">
            {changes.map((row) => (
              <div key={row.field} className="grid gap-0.5">
                <dt className="text-xs font-medium text-muted-foreground">{label(row.field)}</dt>
                <dd className="break-words">
                  {row.before !== undefined && row.before !== row.after && (
                    <span className="text-muted-foreground line-through decoration-muted-foreground/60">{row.before}</span>
                  )}
                  {row.before !== undefined && row.before !== row.after && <span aria-hidden> → </span>}
                  <span className="font-medium">{row.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        )
      )}
      <Collapsible className="min-w-0">
        <CollapsibleTrigger render={<Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" />}>
          {t('details')}
          <ChevronDownIcon data-icon="inline-end" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CodeBlock size="sm">
            <CodeBlockContent wrap className="max-h-64">
              {JSON.stringify(input, null, 2)}
            </CodeBlockContent>
          </CodeBlock>
        </CollapsibleContent>
      </Collapsible>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAnswer(false)}>
          {t('deny')}
        </Button>
        <Button size="sm" disabled={disabled} onClick={() => onAnswer(true)}>
          {t('approve')}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { Media } from '@/payload-types'
import { api, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'

export type MediaSummary = Pick<Media, 'id' | 'alt' | 'url' | 'filename' | 'mimeType'>

// An image node's picture: the media itself when the node carries it, otherwise fetched by id
// (again whenever the id changes).
export function MediaPreview({ value }: { value: unknown }) {
  const given = value && typeof value === 'object' && 'url' in value ? (value as MediaSummary) : null
  const id = value && typeof value === 'object' && 'id' in value ? value.id : value
  const [fetched, setFetched] = useState<MediaSummary | null>(null)
  const current = fetched && String(fetched.id) === String(id) ? fetched : null
  useEffect(() => {
    if (given || current || (typeof id !== 'number' && typeof id !== 'string')) return
    api<MediaSummary>(`media/${id}${query({ depth: 0 })}`).then(setFetched, () => undefined)
  }, [given, current, id])
  const media = given ?? current
  if (!media?.url) return <Skeleton className="my-3 h-40 w-full max-w-md" />
  // eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload.
  return <img src={media.url} alt={media.alt} className="my-3 max-h-80 max-w-full rounded-md border" />
}

// The website's media library as a grid to pick one image from. Opened by `trigger`, or controlled
// with `open`/`onOpenChange` (from a menu item). `mimeTypes` limits the images shown.
export function MediaPicker({
  site,
  trigger,
  onSelect,
  open: controlled,
  onOpenChange,
  mimeTypes,
  title,
  description,
}: {
  site: number
  trigger?: React.ReactElement
  onSelect: (media: MediaSummary) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mimeTypes?: string[]
  title?: string
  description?: string
}) {
  const { t } = useI18n()
  const [uncontrolled, setUncontrolled] = useState(false)
  const open = controlled ?? uncontrolled
  const setOpen = onOpenChange ?? setUncontrolled
  const [items, setItems] = useState<MediaSummary[] | undefined>()
  const types = mimeTypes?.join(',')

  useEffect(() => {
    if (!open) return
    api<{ docs: MediaSummary[] }>(
      `media${query({
        'where[tenant][equals]': site,
        ...(types ? { 'where[mimeType][in]': types } : {}),
        limit: 60,
        sort: '-createdAt',
        depth: 0,
      })}`,
    ).then(({ docs }) => setItems(docs), () => setItems([]))
  }, [open, site, types])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? t('insertImage')}</DialogTitle>
          <DialogDescription>{description ?? t('chooseImage')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {items === undefined ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : items.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="overflow-hidden rounded-md border text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                >
                  <AspectRatio ratio={4 / 3} className="bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload. */}
                    <img src={item.url ?? ''} alt={item.alt} className="size-full object-cover" />
                  </AspectRatio>
                  <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{item.alt}</span>
                </button>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t('noMedia')}</EmptyTitle>
                <EmptyDescription>{t('noMediaDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

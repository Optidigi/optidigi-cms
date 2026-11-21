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

type MediaSummary = Pick<Media, 'id' | 'alt' | 'url' | 'filename'>

export function MediaPreview({ value }: { value: unknown }) {
  const [media, setMedia] = useState<MediaSummary | null>(
    value && typeof value === 'object' && 'url' in value ? (value as MediaSummary) : null,
  )
  const id = value && typeof value === 'object' && 'id' in value ? value.id : value
  useEffect(() => {
    if (media || (typeof id !== 'number' && typeof id !== 'string')) return
    api<MediaSummary>(`media/${id}${query({ depth: 0 })}`).then(setMedia, () => undefined)
  }, [id, media])
  if (!media?.url) return <Skeleton className="my-3 h-40 w-full max-w-md" />
  // eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload.
  return <img src={media.url} alt={media.alt} className="my-3 max-h-80 max-w-full rounded-md border" />
}

export function MediaPicker({
  site,
  trigger,
  onSelect,
}: {
  site: number
  trigger: React.ReactElement
  onSelect: (id: number) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaSummary[] | undefined>()

  useEffect(() => {
    if (!open) return
    api<{ docs: MediaSummary[] }>(
      `media${query({ 'where[tenant][equals]': site, limit: 60, sort: '-createdAt', depth: 0 })}`,
    ).then(({ docs }) => setItems(docs), () => setItems([]))
  }, [open, site])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('insertImage')}</DialogTitle>
          <DialogDescription>{t('chooseImage')}</DialogDescription>
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
                    onSelect(item.id)
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

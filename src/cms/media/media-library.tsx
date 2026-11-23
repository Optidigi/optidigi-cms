'use client'

import { ImageIcon, UploadIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { MediaDetails } from './media-details'

export type MediaItem = {
  id: number
  alt: string
  url: string
  filename: string
  filesize: number
  width: number
  height: number
  updatedAt: string
}

type Upload = { key: string; name: string; state: 'uploading' | 'error' }

const accept = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml'

export function MediaLibrary({ site, language, items }: { site: number; language: string; items: MediaItem[] }) {
  const { t } = useI18n()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<MediaItem>()

  async function upload(files: FileList | File[]) {
    const list = [...files]
    if (!list.length) return
    const pending = list.map((file, index) => ({ key: `${Date.now()}-${index}`, name: file.name, state: 'uploading' as const }))
    setUploads((current) => [...pending, ...current])
    const saved: string[] = []
    let failed = 0
    await Promise.all(
      list.map(async (file, index) => {
        // Payload's native upload: the file plus the document fields as `_payload`.
        const form = new FormData()
        form.append('file', file)
        form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, ''), tenant: site }))
        try {
          // Payload renames a file whose name is taken; show the name it was stored under.
          const { doc } = await api<{ doc: { filename?: string } }>('media', { method: 'POST', body: form })
          saved.push(doc.filename ?? file.name)
          setUploads((current) => current.filter(({ key }) => key !== pending[index].key))
        } catch {
          failed++
          setUploads((current) => current.map((item) => (item.key === pending[index].key ? { ...item, state: 'error' } : item)))
        }
      }),
    )
    if (saved.length) {
      toast.success(t('uploaded'), { description: saved.join(', ') })
      router.refresh()
    }
    if (failed) toast.error(t('uploadFailed'))
  }

  return (
    <>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          upload(event.dataTransfer.files)
        }}
      >
        <Empty className={cn('border border-dashed', dragging && 'border-primary bg-muted/50')}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadIcon />
            </EmptyMedia>
            <EmptyTitle>{t('dropFiles')}</EmptyTitle>
            <EmptyDescription>JPEG, PNG, WebP, AVIF, GIF · max 8 MB</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => input.current?.click()}>
              <UploadIcon data-icon="inline-start" />
              {t('upload')}
            </Button>
            <input
              ref={input}
              type="file"
              accept={accept}
              multiple
              hidden
              aria-label={t('upload')}
              onChange={(event) => {
                if (event.target.files) upload(event.target.files)
                event.target.value = ''
              }}
            />
          </EmptyContent>
        </Empty>
      </div>

      {uploads.length > 0 && (
        <AttachmentGroup>
          {uploads.map((item) => (
            <Attachment key={item.key} state={item.state}>
              <AttachmentMedia>{item.state === 'uploading' ? <Spinner /> : <ImageIcon />}</AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{item.name}</AttachmentTitle>
                <AttachmentDescription>{item.state === 'uploading' ? t('uploading') : t('uploadFailed')}</AttachmentDescription>
              </AttachmentContent>
              {item.state === 'error' && (
                <AttachmentActions>
                  <AttachmentAction aria-label={t('cancel')} onClick={() => setUploads((current) => current.filter(({ key }) => key !== item.key))}>
                    <XIcon />
                  </AttachmentAction>
                </AttachmentActions>
              )}
            </Attachment>
          ))}
        </AttachmentGroup>
      )}

      {items.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="gap-0 overflow-hidden p-0">
              <button type="button" className="text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => setSelected(item)}>
                <AspectRatio ratio={4 / 3} className="bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload. */}
                  <img src={item.url} alt={item.alt} loading="lazy" className="size-full object-cover" />
                </AspectRatio>
                <span className="block truncate px-3 py-2 text-sm">{item.alt || item.filename}</span>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noMediaDescription')}</p>
      )}

      <MediaDetails item={selected} language={language} onClose={() => setSelected(undefined)} />
    </>
  )
}

'use client'

import { ExternalLinkIcon, MonitorIcon, SmartphoneIcon, TabletIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useI18n } from '../client/i18n-provider'

const widths = { desktop: '100%', tablet: '768px', phone: '390px' } as const
type Width = keyof typeof widths

// The website's own /cms-preview page in a frame, using the read-only preview grant in `src`.
// It speaks Payload's live preview protocol: the website says it's ready with
// `{ type: 'payload-live-preview', ready: true }`, and after each save the admin sends
// `{ type: 'payload-document-event' }` so the website reloads its drafts. Messages go only to the
// website's own origin and are only accepted from it.
export function LivePreview({ src, revision, onClose }: { src: string; revision: number; onClose?: () => void }) {
  const { t } = useI18n()
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [width, setWidth] = useState<Width>('desktop')
  const origin = new URL(src).origin

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return
      const data = event.data as { type?: unknown; ready?: unknown } | null
      if (data?.type === 'payload-live-preview' && data.ready === true) setReady(true)
    }
    window.addEventListener('message', receive)
    const timer = setTimeout(() => setSlow(true), 8000)
    return () => {
      window.removeEventListener('message', receive)
      clearTimeout(timer)
    }
  }, [origin])

  useEffect(() => {
    if (ready && revision > 0) frame.current?.contentWindow?.postMessage({ type: 'payload-document-event' }, origin)
  }, [ready, revision, origin])

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
          {!ready && !slow && <Spinner className="text-muted-foreground" />}
          <span className="truncate">{t('livePreview')}</span>
        </span>
        <ToggleGroup
          variant="outline"
          size="sm"
          className="hidden md:flex"
          value={[width]}
          aria-label={t('previewWidth')}
          onValueChange={(value) => value[0] && setWidth(value[0] as Width)}
        >
          <ToggleGroupItem value="desktop" aria-label={t('desktop')}>
            <MonitorIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="tablet" aria-label={t('tablet')}>
            <TabletIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="phone" aria-label={t('phoneWidth')}>
            <SmartphoneIcon />
          </ToggleGroupItem>
        </ToggleGroup>
        <a href={src} target="_blank" rel="noreferrer" aria-label={t('openInNewTab')} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
          <ExternalLinkIcon />
        </a>
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label={t('closePreview')} onClick={onClose}>
            <XIcon />
          </Button>
        )}
      </div>
      {slow && !ready && (
        <Alert className="m-3 w-auto">
          <AlertTitle>{t('previewNotLiveTitle')}</AlertTitle>
          <AlertDescription>{t('previewNotLiveDescription')}</AlertDescription>
          <AlertAction>
            <a href={src} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('openInNewTab')}
            </a>
          </AlertAction>
        </Alert>
      )}
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3">
        <iframe
          ref={frame}
          src={src}
          title={t('livePreview')}
          className={cn('h-full shrink-0 rounded-md border bg-background', width === 'desktop' && 'w-full')}
          style={width === 'desktop' ? undefined : { width: widths[width] }}
        />
      </div>
    </div>
  )
}

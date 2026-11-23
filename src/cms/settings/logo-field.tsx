'use client'

import { ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { api, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { MediaPicker, type MediaSummary } from '../editor/media-picker'

// One of the website's logos: a preview, picked from the media library (where SVGs can be uploaded).
export function LogoField({
  site,
  id,
  label,
  description,
  value,
  onChange,
  shape = 'wide',
  surface = 'light',
  error,
}: {
  site: number
  id: string
  label: string
  description: string
  value: number | null
  onChange: (value: number | null) => void
  shape?: 'wide' | 'square'
  surface?: 'light' | 'dark'
  error?: string
}) {
  const { t } = useI18n()
  const [media, setMedia] = useState<MediaSummary | null>(null)

  useEffect(() => {
    if (value === null || media?.id === value) return
    api<MediaSummary>(`media/${value}${query({ depth: 0 })}`).then(setMedia, () => setMedia(null))
  }, [value, media?.id])

  const shown = value !== null && media?.id === value ? media : null
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-2',
            shape === 'square' ? 'size-16' : 'h-16 w-44',
            surface === 'dark' ? 'bg-neutral-900' : 'bg-white',
          )}
        >
          {shown?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload.
            <img src={shown.url} alt={shown.alt} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="size-5 text-neutral-400" />
          )}
        </div>
        <div className="flex gap-2">
          <MediaPicker
            site={site}
            title={label}
            description={t('chooseLogo')}
            onSelect={(picked) => {
              setMedia(picked)
              onChange(picked.id)
            }}
            trigger={
              <Button id={id} type="button" variant="outline" size="sm">
                {value === null ? t('choose') : t('replace')}
              </Button>
            }
          />
          {value !== null && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              {t('remove')}
            </Button>
          )}
        </div>
      </div>
      <FieldDescription>{description}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

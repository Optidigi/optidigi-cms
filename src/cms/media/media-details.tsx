'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from '../content/delete-dialog'
import { formatDate } from '../content/status-badge'
import type { MediaItem } from './media-library'

export function MediaDetails({ item, language, onClose }: { item?: MediaItem; language: string; onClose: () => void }) {
  const { t } = useI18n()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  return (
    <>
      <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-md">
          {item && (
            <DetailsForm key={item.id} item={item} language={language} onClose={onClose} onDelete={() => setDeleting(true)} />
          )}
        </SheetContent>
      </Sheet>
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={async () => {
          if (!item) return
          try {
            await api(`media/${item.id}`, { method: 'DELETE' })
            toast.success(t('deleted'))
            onClose()
            router.refresh()
          } catch {
            toast.error(t('deleteFailed'))
          }
          setDeleting(false)
        }}
      />
    </>
  )
}

function DetailsForm({
  item,
  language,
  onClose,
  onDelete,
}: {
  item: MediaItem
  language: string
  onClose: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [alt, setAlt] = useState(item.alt)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await api(`media/${item.id}?depth=0`, { method: 'PATCH', json: { alt } })
      toast.success(t('savedToast'))
      router.refresh()
      onClose()
    } catch (caught) {
      setError(caught instanceof APIError ? caught.fields.alt ?? caught.message : t('saveFailed'))
    }
    setSaving(false)
  }

  return (
            <form onSubmit={save} className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle className="truncate">{item.filename}</SheetTitle>
                <SheetDescription>
                  {/* SVGs have no pixel size. */}
                  {[
                    item.width && item.height ? `${item.width}×${item.height}` : null,
                    item.filesize ? `${Math.round(item.filesize / 1024)} KB` : null,
                    formatDate(item.updatedAt, language),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
                <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Payload serves the original upload. */}
                  <img src={item.url ?? undefined} alt={item.alt} className="size-full object-contain" />
                </AspectRatio>
                <FieldGroup>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="alt">{t('altText')}</FieldLabel>
                    <Input id="alt" value={alt} required aria-invalid={error ? true : undefined} onChange={(event) => setAlt(event.target.value)} />
                    <FieldDescription>{t('altTextDescription')}</FieldDescription>
                    {error && <FieldError>{error}</FieldError>}
                  </Field>
                </FieldGroup>
              </div>
              <SheetFooter className="flex-row justify-between">
                <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}>
                  {t('delete')}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Spinner data-icon="inline-start" />}
                  {t('save')}
                </Button>
              </SheetFooter>
            </form>
  )
}

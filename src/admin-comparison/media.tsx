'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { deleteMedia } from './media-actions'

export function MediaForm({
  site,
  media,
  canDelete,
}: {
  site: number
  media?: { id: number; alt: string; updatedAt: string }
  canDelete: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const base = '/admin-shadcn/' + site + '/media'
  return (
    <Card>
      <CardHeader>
        <CardTitle>{media ? 'Afbeelding bewerken' : 'Afbeelding toevoegen'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={success ? 'default' : 'destructive'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (pending) return
            const element = event.currentTarget
            const form = new FormData(element)
            const file = form.get('file')
            if (file instanceof File && file.size > 8 * 1024 * 1024) {
              setSuccess(false)
              setMessage('Kies een afbeelding van maximaal 8 MB.')
              return
            }
            setPending(true)
            setMessage('')
            try {
              const data = {
                alt: String(form.get('alt') ?? ''),
                ...(media ? {} : { tenant: site }),
              }
              const multipart = new FormData()
              multipart.set('_payload', JSON.stringify(data))
              if (file instanceof File && file.size > 0) multipart.set('file', file)
              const result = await fetch('/api/media' + (media ? '/' + media.id : ''), {
                method: media ? 'PATCH' : 'POST',
                credentials: 'same-origin',
                body: multipart,
              })
              if (!result.ok) throw Error('Media operation failed')
              const { doc } = (await result.json()) as { doc?: { id: number } }
              setSuccess(true)
              setMessage('Afbeelding opgeslagen.')
              const fileInput = element.elements.namedItem('file')
              if (fileInput instanceof HTMLInputElement) fileInput.value = ''
              if (!media && doc?.id) router.replace(base + '?id=' + doc.id)
              else router.refresh()
            } catch {
              setSuccess(false)
              setMessage('Opslaan is niet gelukt. Controleer het bestand en je toegangsrechten.')
            } finally {
              setPending(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="media-alt">Alternatieve tekst</FieldLabel>
              <Input id="media-alt" name="alt" defaultValue={media?.alt} required maxLength={500} />
            </Field>
            <Field>
              <FieldLabel htmlFor="media-file">
                {media ? 'Bestand vervangen' : 'Afbeelding'}
              </FieldLabel>
              <Input
                id="media-file"
                name="file"
                type="file"
                required={!media}
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              />
              <FieldDescription>JPEG, PNG, WebP, AVIF of GIF. Maximaal 8 MB.</FieldDescription>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Bezig…' : media ? 'Wijzigingen opslaan' : 'Uploaden'}
              </Button>
              {media && canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirm(true)}
                >
                  Verwijderen
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
        {confirm && media && (
          <Alert variant="destructive">
            <AlertDescription>Wil je deze afbeelding definitief verwijderen?</AlertDescription>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirm(false)}>
                Annuleren
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  const form = new FormData()
                  form.set('site', String(site))
                  form.set('id', String(media.id))
                  form.set('revision', media.updatedAt)
                  try {
                    if (await deleteMedia(form)) router.replace(base)
                    else throw Error('Media delete failed')
                  } catch {
                    setSuccess(false)
                    setMessage('Verwijderen is niet gelukt. Laad de afbeelding opnieuw.')
                  } finally {
                    setPending(false)
                    setConfirm(false)
                  }
                }}
              >
                Verwijderen bevestigen
              </Button>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

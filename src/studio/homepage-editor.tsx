'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { commitHomepage } from './actions'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

const feedback = {
  saved: 'Concept opgeslagen.',
  published: 'Homepage gepubliceerd.',
  conflict: 'Een andere wijziging is gevonden. Kopieer je tekst en herlaad voordat je verdergaat.',
  failed: 'Opslaan mislukt. Je wijzigingen staan nog in de velden.',
}

export function HomepageEditor({
  site,
  locale,
  initial,
}: {
  site: number
  locale: 'nl' | 'en'
  initial: { heading?: string | null; description?: string | null; updatedAt: string }
}) {
  const [heading, setHeading] = useState(initial.heading ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [result, setResult] = useState<keyof typeof feedback>()
  const [busy, setBusy] = useState(false)
  const revision = useRef(initial.updatedAt)
  const [saved, setSaved] = useState({ heading, description })
  const running = useRef(false)
  const dirty = saved.heading !== heading || saved.description !== description

  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const save = useCallback(
    async (intent: 'draft' | 'publish') => {
      if (running.current || result === 'conflict') return
      running.current = true
      setBusy(true)
      const fields = { heading, description }
      try {
        const next = await commitHomepage({
          site,
          locale,
          revision: revision.current,
          ...fields,
          intent,
        })
        if ('revision' in next && next.revision) {
          revision.current = next.revision
          setSaved(fields)
          window.dispatchEvent(new Event('optidigi:homepage-saved'))
        }
        setResult(next.result)
      } catch {
        setResult('failed')
      } finally {
        running.current = false
        setBusy(false)
      }
    },
    [site, locale, heading, description, result],
  )

  useEffect(() => {
    if (!dirty || busy || result === 'conflict' || result === 'failed') return
    const timer = window.setTimeout(() => void save('draft'), 1400)
    return () => window.clearTimeout(timer)
  }, [save, dirty, busy, result])

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save('draft')
      }}
    >
      {result && (
        <Alert variant={result === 'conflict' || result === 'failed' ? 'destructive' : 'default'}>
          <AlertDescription>{feedback[result]}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="heading">Kop</Label>
        <Input
          id="heading"
          value={heading}
          onChange={(event) => setHeading(event.target.value)}
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Intro</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={5}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="outline" disabled={busy || result === 'conflict'}>
          Concept opslaan
        </Button>
        <Button
          type="button"
          onClick={() => void save('publish')}
          disabled={busy || result === 'conflict'}
        >
          Publiceren
        </Button>
        <span className="text-xs text-muted-foreground" role="status">
          {busy ? 'Opslaan…' : dirty ? 'Niet opgeslagen' : 'Opgeslagen'}
        </span>
      </div>
    </form>
  )
}

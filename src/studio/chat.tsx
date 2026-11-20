'use client'

import { Send, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type {
  Approval,
  AssistantEvent,
  AssistantMessage,
  Connection,
  ModelProvider,
  ResponseDetail,
} from '../assistant/protocol'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Message, MessageContent, MessageGroup } from './ui/message'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import { Textarea } from './ui/textarea'

async function call(site: number, body: Record<string, unknown>, signal: AbortSignal) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, tenant: site }),
    signal,
  })
  if (!response.ok) throw new Error('De assistent kon dit verzoek niet uitvoeren.')
  return response
}

export function StudioChat({
  site,
  documentID,
  locale = 'nl',
  canManage,
}: {
  site: number
  documentID?: number
  locale?: 'nl' | 'en'
  canManage: boolean
}) {
  const [connection, setConnection] = useState<Connection>()
  const [modelName, setModelName] = useState<string>()
  const [detail, setDetail] = useState<ResponseDetail>('standard')
  const [provider, setProvider] = useState<ModelProvider>('openai')
  const [showSettings, setShowSettings] = useState(false)
  const [savedDraft, setSavedDraft] = useState<Extract<AssistantEvent, { type: 'draft-saved' }>>()
  const [connected, setConnected] = useState<boolean>()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [approval, setApproval] = useState<Approval>()
  const [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void call(site, { action: 'status' }, controller.signal)
      .then(
        (response) =>
          response.json() as Promise<{ connected: boolean; model?: string; settings?: Connection }>,
      )
      .then(({ connected, model, settings }) => {
        setConnected(connected)
        setModelName(model)
        setConnection(settings)
        setProvider(settings?.provider ?? 'openai')
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('De modelverbinding kon niet worden geladen.')
      })
    return () => {
      controller.abort()
      request.current?.abort()
    }
  }, [site])

  async function run(work: (signal: AbortSignal) => Promise<void>) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    try {
      await work(controller.signal)
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Verzoek mislukt.')
    } finally {
      request.current = null
      setBusy(false)
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!connected || busy || approval || !input.trim()) return
    const next: AssistantMessage[] = [...messages, { role: 'user', content: input.trim() }]
    setMessages(next)
    setInput('')
    await run(async (signal) => {
      const recent = next.slice(-16)
      const response = await call(
        site,
        {
          action: 'chat',
          messages: recent.slice(recent.findIndex(({ role }) => role === 'user')),
          detail,
          locale,
          ...(documentID && { context: { collection: 'pages', id: documentID } }),
        },
        signal,
      )
      if (!response.body) throw new Error('Geen antwoord ontvangen.')
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let pending = ''
      let answer = ''
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          pending += value
          for (let end = pending.indexOf('\n\n'); end >= 0; end = pending.indexOf('\n\n')) {
            const line = pending.slice(0, end)
            pending = pending.slice(end + 2)
            if (!line.startsWith('data: ')) continue
            const item = JSON.parse(line.slice(6)) as AssistantEvent
            if (item.type === 'text') {
              answer += item.text
              setReply(answer)
            }
            if (item.type === 'approval') setApproval(item.approval)
            if (item.type === 'error') setError(item.message)
            if (item.type === 'draft-saved') setSavedDraft(item)
          }
        }
      } finally {
        reader.releaseLock()
        if (answer) setMessages([...next, { role: 'assistant', content: answer.slice(0, 6000) }])
        setReply('')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-primary" /> Vraag AI
        </CardTitle>
        <CardDescription>
          {documentID ? 'Je werkt aan de homepage' : 'Vragen en opdrachten voor deze website'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {connected === undefined && !error && (
          <p role="status" className="text-sm text-muted-foreground">
            Modelverbinding laden…
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {modelName && <span className="text-sm font-medium">{modelName}</span>}
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={showSettings}
              onClick={() => setShowSettings(!showSettings)}
            >
              {connected ? 'Modelverbinding' : 'Verbind een model'}
            </Button>
          )}
        </div>
        {connected === false && !canManage && (
          <Alert>
            <AlertDescription>
              Vraag een websitebeheerder om een model te verbinden.
            </AlertDescription>
          </Alert>
        )}
        {showSettings && canManage && (
          <form
            className="grid gap-3 rounded-lg border bg-background p-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              const values = new FormData(form)
              void run(async (signal) => {
                const response = await call(
                  site,
                  {
                    action: 'connect',
                    provider,
                    model: values.get('model'),
                    apiKey: values.get('apiKey'),
                    baseURL: values.get('baseURL') ?? undefined,
                  },
                  signal,
                )
                const saved = (await response.json()) as {
                  connected: boolean
                  settings?: Connection
                }
                form.reset()
                setConnected(saved.connected)
                setConnection(saved.settings)
                setModelName(saved.settings?.model)
                setShowSettings(false)
              })
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="studio-provider">Provider</Label>
              <NativeSelect
                id="studio-provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as ModelProvider)}
              >
                <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
                <NativeSelectOption value="anthropic">Anthropic</NativeSelectOption>
                <NativeSelectOption value="openai-compatible">OpenAI-compatible</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studio-model">Model ID</Label>
              <Input id="studio-model" name="model" defaultValue={connection?.model} required />
            </div>
            {provider === 'openai-compatible' && (
              <div className="grid gap-2">
                <Label htmlFor="studio-base-url">Provider-URL</Label>
                <Input
                  id="studio-base-url"
                  name="baseURL"
                  type="url"
                  defaultValue={connection?.baseURL ?? ''}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="studio-api-key">API-sleutel</Label>
              <Input
                id="studio-api-key"
                name="apiKey"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                Verbinding opslaan
              </Button>
              {connected && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async (signal) => {
                      await call(site, { action: 'disconnect' }, signal)
                      setConnected(false)
                      setModelName(undefined)
                      setConnection(undefined)
                      setShowSettings(false)
                    })
                  }
                >
                  Loskoppelen
                </Button>
              )}
            </div>
          </form>
        )}
        {savedDraft && (
          <Alert>
            <AlertDescription>Homepageconcept opgeslagen.</AlertDescription>
            <div className="col-start-1 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={'/studio/' + site + '?locale=' + savedDraft.locale}>Open concept</Link>
              </Button>
              {savedDraft.preview && (
                <Button asChild variant="outline" size="sm">
                  <a href={savedDraft.preview} target="_blank" rel="noreferrer">
                    Voorbeeld
                  </a>
                </Button>
              )}
            </div>
          </Alert>
        )}
        {(messages.length > 0 || reply) && (
          <MessageGroup role="log" aria-label="Gesprek" className="max-h-80 overflow-y-auto">
            {[...messages, ...(reply ? [{ role: 'assistant' as const, content: reply }] : [])].map(
              (entry, index) => (
                <Message key={index} align={entry.role === 'user' ? 'end' : 'start'}>
                  <MessageContent className="whitespace-pre-wrap">{entry.content}</MessageContent>
                </Message>
              ),
            )}
          </MessageGroup>
        )}
        {approval && (
          <Alert>
            <AlertDescription>
              Document verwijderen: {approval.label} (#{approval.id})
            </AlertDescription>
            <div className="col-start-1 flex gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(async (signal) => {
                    await call(site, { action: 'approve', token: approval.token }, signal)
                    setApproval(undefined)
                  })
                }
              >
                Verwijderen bevestigen
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setApproval(undefined)}
              >
                Annuleren
              </Button>
            </div>
          </Alert>
        )}
        <form onSubmit={ask} className="grid gap-2">
          <Textarea
            aria-label="Bericht"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              documentID ? 'Vraag iets over deze homepage…' : 'Vraag iets over deze website…'
            }
            maxLength={6000}
            disabled={!connected}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <NativeSelect
              aria-label="Antwoordlengte"
              value={detail}
              onChange={(event) => setDetail(event.currentTarget.value as ResponseDetail)}
              size="sm"
            >
              <NativeSelectOption value="brief">Kort antwoord</NativeSelectOption>
              <NativeSelectOption value="standard">Standaard antwoord</NativeSelectOption>
              <NativeSelectOption value="detailed">Uitgebreid antwoord</NativeSelectOption>
            </NativeSelect>
            {busy ? (
              <Button type="button" variant="outline" onClick={() => request.current?.abort()}>
                <Square aria-hidden="true" /> Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!connected || Boolean(approval) || !input.trim()}>
                <Send aria-hidden="true" /> Versturen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

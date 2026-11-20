'use client'

import { Send, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Approval, AssistantEvent, AssistantMessage } from '../assistant/protocol'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Message, MessageContent, MessageGroup } from './ui/message'
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

export function StudioChat({ site, documentID }: { site: number; documentID: number }) {
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
      .then((response) => response.json() as Promise<{ connected: boolean }>)
      .then(({ connected }) => setConnected(connected))
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
      const response = await call(
        site,
        {
          action: 'chat',
          messages: next.slice(-16),
          context: { collection: 'pages', id: documentID },
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
        <CardDescription>Context: opgeslagen homepage #{documentID}</CardDescription>
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
        {connected === false && (
          <Alert>
            <AlertDescription>Verbind eerst een model in de bestaande assistent.</AlertDescription>
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
            placeholder="Vraag iets over deze homepage…"
            maxLength={6000}
            disabled={!connected}
          />
          <div className="flex justify-end">
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

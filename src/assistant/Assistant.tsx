'use client'

import { Button } from '@payloadcms/ui'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type {
  Approval,
  AssistantEvent,
  AssistantMessage,
  Connection,
  ModelProvider,
} from './protocol'
import './assistant.css'

type Tenant = { id: number; name: string; canManage: boolean }
type Status = { connected: boolean; settings?: Connection }

const providerLabels: Record<ModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible',
}

async function action(
  endpoint: string,
  tenant: number,
  fields: Record<string, unknown>,
  signal: AbortSignal,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant, ...fields }),
    signal,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === 'string' ? body.error : 'The assistant is unavailable.')
  }
  return response
}

async function readEvents(response: Response, onEvent: (event: AssistantEvent) => void) {
  if (!response.body) throw new Error('No assistant stream was received.')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let pending = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      pending += value
      let end = pending.indexOf('\n\n')
      while (end >= 0) {
        const line = pending.slice(0, end)
        pending = pending.slice(end + 2)
        if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)) as AssistantEvent)
        end = pending.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function Assistant({
  endpoint,
  selected,
  tenants,
}: {
  endpoint: string
  selected: number
  tenants: Tenant[]
}) {
  const [id, setId] = useState(selected)
  const tenant = tenants.find((option) => option.id === id) ?? tenants[0]

  return (
    <main className="optidigi-assistant">
      <h1>Assistant</h1>
      {tenants.length > 1 && (
        <label>
          Tenant
          <select value={tenant?.id} onChange={(event) => setId(Number(event.currentTarget.value))}>
            {tenants.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {tenant ? (
        <TenantAssistant key={tenant.id} endpoint={endpoint} tenant={tenant} />
      ) : (
        <p>Ask a platform admin to add you to a tenant.</p>
      )}
    </main>
  )
}

function TenantAssistant({ endpoint, tenant }: { endpoint: string; tenant: Tenant }) {
  const [status, setStatus] = useState<Status>()
  const [editing, setEditing] = useState(false)
  const [provider, setProvider] = useState<ModelProvider>('openai')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState('')
  const [approval, setApproval] = useState<Approval>()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void action(endpoint, tenant.id, { action: 'status' }, controller.signal)
      .then((response) => response.json() as Promise<Status>)
      .then((value) => {
        setStatus(value)
        setProvider(value.settings?.provider ?? 'openai')
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message)
      })
    return () => {
      controller.abort()
      request.current?.abort()
    }
  }, [endpoint, tenant.id])

  async function run(work: (signal: AbortSignal) => Promise<void>) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work(controller.signal)
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : 'The request failed.')
    } finally {
      request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    void run(async (signal) => {
      const response = await action(
        endpoint,
        tenant.id,
        {
          action: 'connect',
          provider,
          model: values.get('model'),
          apiKey: values.get('apiKey'),
          baseURL: values.get('baseURL') ?? undefined,
        },
        signal,
      )
      setStatus((await response.json()) as Status)
      form.reset()
      setEditing(false)
      setNotice('Model settings saved.')
    })
  }

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    void run(async (signal) => {
      const next: AssistantMessage[] = [...messages, { role: 'user', content: draft.trim() }]
      setMessages(next)
      setDraft('')
      setReply('')
      let answer = ''
      const recent = next.slice(-16)
      const history = recent[0].role === 'assistant' ? recent.slice(1) : recent
      const response = await action(
        endpoint,
        tenant.id,
        { action: 'chat', messages: history },
        signal,
      )
      await readEvents(response, (event) => {
        if (event.type === 'text') {
          answer += event.text
          setReply(answer)
        } else if (event.type === 'approval') {
          setApproval(event.approval)
        } else {
          setError(event.message)
        }
      })
      if (answer) setMessages([...next, { role: 'assistant', content: answer.slice(0, 6000) }])
      setReply('')
    })
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!status && !error && <p role="status">Loading model settings…</p>}
      {status && !status.connected && (
        <p>
          {tenant.canManage
            ? 'Connect a model to use the assistant.'
            : 'Ask a tenant admin to connect a model.'}
        </p>
      )}
      {tenant.canManage && status && (!status.connected || editing) && (
        <form onSubmit={connect} className="optidigi-assistant__form">
          <label>
            Provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.currentTarget.value as ModelProvider)}
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model ID
            <input name="model" defaultValue={status.settings?.model} required maxLength={150} />
          </label>
          {provider === 'openai-compatible' && (
            <label>
              Provider base URL
              <input
                name="baseURL"
                type="url"
                defaultValue={status.settings?.baseURL ?? ''}
                required
                maxLength={1024}
              />
            </label>
          )}
          <label>
            API key
            <input name="apiKey" type="password" autoComplete="off" required maxLength={4096} />
          </label>
          <div className="optidigi-assistant__actions">
            <Button type="submit" disabled={busy}>
              Save connection
            </Button>
            {editing && (
              <Button buttonStyle="secondary" disabled={busy} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
      {status?.connected && !editing && (
        <>
          {tenant.canManage && (
            <div className="optidigi-assistant__actions">
              <Button buttonStyle="secondary" disabled={busy} onClick={() => setEditing(true)}>
                Model settings
              </Button>
              <Button
                buttonStyle="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async (signal) => {
                    const response = await action(
                      endpoint,
                      tenant.id,
                      { action: 'disconnect' },
                      signal,
                    )
                    setStatus((await response.json()) as Status)
                    setMessages([])
                    setApproval(undefined)
                    setNotice('Model disconnected.')
                  })
                }
              >
                Disconnect
              </Button>
            </div>
          )}
          {(messages.length > 0 || reply) && (
            <div className="optidigi-assistant__messages" role="log" aria-label="Conversation">
              {messages.map((message, index) => (
                <p key={index}>
                  <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
                  {message.content}
                </p>
              ))}
              {reply && (
                <p>
                  <strong>Assistant</strong>
                  {reply}
                </p>
              )}
            </div>
          )}
          {approval && (
            <section className="optidigi-assistant__approval" aria-label="Delete approval">
              <p>
                Delete <strong>{approval.label}</strong> ({approval.collection} #{approval.id})?
              </p>
              <div className="optidigi-assistant__actions">
                <Button
                  buttonStyle="destructive"
                  disabled={busy}
                  onClick={() =>
                    void run(async (signal) => {
                      await action(
                        endpoint,
                        tenant.id,
                        { action: 'approve', token: approval.token },
                        signal,
                      )
                      setApproval(undefined)
                      setNotice(`Deleted ${approval.label}.`)
                    })
                  }
                >
                  Confirm delete
                </Button>
                <Button
                  buttonStyle="secondary"
                  disabled={busy}
                  onClick={() => setApproval(undefined)}
                >
                  Cancel
                </Button>
              </div>
            </section>
          )}
          <form onSubmit={ask} className="optidigi-assistant__form">
            <label htmlFor="assistant-message">Message</label>
            <textarea
              id="assistant-message"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              maxLength={6000}
              rows={4}
              required
            />
            <div>
              <Button type="submit" disabled={busy || Boolean(approval) || !draft.trim()}>
                {busy ? 'Working…' : 'Send'}
              </Button>
            </div>
          </form>
        </>
      )}
    </>
  )
}

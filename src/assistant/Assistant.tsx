'use client'

import {
  Banner,
  Button,
  ConfirmationModal,
  FieldLabel,
  Link,
  Pill,
  SelectInput,
  TextInput,
  useConfig,
  useModal,
  usePathname,
} from '@payloadcms/ui'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type {
  Approval,
  AssistantEvent,
  AssistantMessage,
  Connection,
  ModelProvider,
} from './protocol'
import { useAssistantConversation } from './conversation'
import { contextCollections } from './protocol'
import { AssistantIcon } from './Icon'
import './assistant.css'

type Tenant = { id: number; name: string; canManage: boolean }
type Status = { connected: boolean; settings?: Connection }

const providerOptions: { label: string; value: ModelProvider }[] = [
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-compatible', value: 'openai-compatible' },
]

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
  tenant,
  mode,
  settingsURL,
  surface,
}: {
  endpoint: string
  tenant: Tenant
  mode: 'chat' | 'settings'
  settingsURL: string
  surface: 'page' | 'drawer'
}) {
  const pathname = usePathname()
  const { config } = useConfig()
  const path = pathname.startsWith(config.routes.admin + '/')
    ? pathname.slice(config.routes.admin.length).split('/')
    : []
  const collection = contextCollections.find((slug) => slug === path[2])
  const documentID = Number(path[3])
  const [excludedPath, setExcludedPath] = useState('')
  const context =
    path[1] === 'collections' &&
    collection &&
    Number.isSafeInteger(documentID) &&
    documentID > 0 &&
    excludedPath !== pathname
      ? { collection, id: documentID }
      : undefined
  const { openModal } = useModal()
  const modalSlug = `optidigi-approve-delete-${tenant.id}`
  const [status, setStatus] = useState<Status>()
  const [provider, setProvider] = useState<ModelProvider>('openai')
  const [model, setModel] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const { messages, setMessages } = useAssistantConversation()
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
        setModel(value.settings?.model ?? '')
        setBaseURL(value.settings?.baseURL ?? '')
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
          model,
          apiKey: values.get('apiKey'),
          baseURL: provider === 'openai-compatible' ? baseURL : undefined,
        },
        signal,
      )
      setStatus((await response.json()) as Status)
      form.reset()
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
        { action: 'chat', messages: history, context },
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

  async function approveDelete(pending: Approval) {
    await run(async (signal) => {
      await action(endpoint, tenant.id, { action: 'approve', token: pending.token }, signal)
      setApproval(undefined)
      setNotice(`Deleted ${pending.label}.`)
    })
  }

  return (
    <div className={`optidigi-assistant optidigi-assistant--${mode}`}>
      {surface === 'drawer' && (
        <div className="optidigi-assistant__scope">
          <Pill size="small">{tenant.name}</Pill>
          {status?.connected && tenant.canManage && <Link href={settingsURL}>Model settings</Link>}
        </div>
      )}
      {error && (
        <Banner type="danger">
          <span role="alert">{error}</span>
        </Banner>
      )}
      {notice && (
        <Banner type="success">
          <span role="status">{notice}</span>
        </Banner>
      )}
      {!status && !error && <p role="status">Loading model settings…</p>}
      {mode === 'chat' && status && !status.connected && (
        <div className="optidigi-assistant-empty optidigi-assistant-empty--connection">
          <span className="optidigi-assistant-empty__icon">
            <AssistantIcon name="connect" />
          </span>
          {tenant.canManage ? (
            <>
              <h2>Connect a model</h2>
              <p>Use your own provider key to ask questions and work with your CMS content.</p>
              <Button el="link" to={settingsURL} margin={false}>
                Connect a model
              </Button>
            </>
          ) : (
            <>
              <h2>Model setup required</h2>
              <p>Ask a tenant admin to connect a model.</p>
            </>
          )}
        </div>
      )}
      {mode === 'settings' && tenant.canManage && status && (
        <form onSubmit={connect} className="optidigi-assistant__form optidigi-assistant__settings">
          <SelectInput
            label="Provider"
            name="assistant-provider"
            path="assistant-provider"
            options={providerOptions}
            value={provider}
            isClearable={false}
            onChange={(option) => {
              if (Array.isArray(option)) return
              const selected = providerOptions.find(({ value }) => value === option?.value)
              if (selected) setProvider(selected.value)
            }}
          />
          <TextInput
            label="Model ID"
            path="model"
            value={model}
            required
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setModel(event.currentTarget.value.slice(0, 150))
            }
          />
          {provider === 'openai-compatible' && (
            <TextInput
              label="Provider base URL"
              path="baseURL"
              value={baseURL}
              placeholder="https://provider.example/v1"
              required
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setBaseURL(event.currentTarget.value.slice(0, 1024))
              }
            />
          )}
          <div className="field-type text">
            <FieldLabel label="API key" htmlFor="assistant-api-key" required />
            <input
              id="assistant-api-key"
              className="form-input"
              name="apiKey"
              type="password"
              autoComplete="new-password"
              required
              maxLength={4096}
            />
          </div>
          <div className="optidigi-assistant__actions">
            <Button
              type="submit"
              disabled={
                busy || !model.trim() || (provider === 'openai-compatible' && !baseURL.trim())
              }
            >
              {status.connected ? 'Replace connection' : 'Save connection'}
            </Button>
            {status.connected && (
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
                    setNotice('Model disconnected.')
                  })
                }
              >
                Disconnect
              </Button>
            )}
          </div>
        </form>
      )}
      {mode === 'settings' && !tenant.canManage && (
        <Banner type="warning">Only tenant admins can manage model settings.</Banner>
      )}
      {mode === 'chat' && status?.connected && (
        <>
          {messages.length === 0 && !reply && (
            <div className="optidigi-assistant-empty">
              <span className="optidigi-assistant-empty__icon">
                <AssistantIcon name="spark" />
              </span>
              <h2>What are you working on?</h2>
              <p>Ask about your content or tell me what to update.</p>
            </div>
          )}
          {(messages.length > 0 || reply) && (
            <div className="optidigi-assistant__messages" role="log" aria-label="Conversation">
              {messages.map((message, index) => (
                <p key={index} data-role={message.role}>
                  <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
                  {message.content}
                </p>
              ))}
              {reply && (
                <p data-role="assistant">
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
              <Button
                className="optidigi-assistant__review-delete"
                buttonStyle="secondary"
                disabled={busy}
                onClick={() => openModal(modalSlug)}
              >
                Review delete
              </Button>
              <Button
                className="optidigi-assistant__mobile-delete"
                buttonStyle="destructive"
                disabled={busy}
                onClick={() => void approveDelete(approval)}
              >
                Confirm delete
              </Button>
              <Button
                buttonStyle="secondary"
                disabled={busy}
                onClick={() => setApproval(undefined)}
              >
                Dismiss
              </Button>
              <ConfirmationModal
                modalSlug={modalSlug}
                heading="Delete this document?"
                body={
                  <>
                    This will delete <strong>{approval.label}</strong> ({approval.collection} #
                    {approval.id}).
                  </>
                }
                confirmLabel="Delete document"
                onConfirm={() => approveDelete(approval)}
              />
            </section>
          )}
          <form onSubmit={ask} className="optidigi-assistant__composer">
            {context && (
              <div className="optidigi-assistant__context">
                <span>
                  Current document · {context.collection} #{context.id}
                </span>
                <button
                  type="button"
                  onClick={() => setExcludedPath(pathname)}
                  aria-label="Remove current document context"
                >
                  <AssistantIcon name="close" />
                </button>
              </div>
            )}
            <label className="optidigi-assistant-sr-only" htmlFor="assistant-message">
              Message
            </label>
            <textarea
              id="assistant-message"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              placeholder="Ask or give an instruction…"
              maxLength={6000}
              rows={2}
              required
            />
            <div className="optidigi-assistant__composer-footer">
              {busy && <span role="status">Working…</span>}
              <button
                type="submit"
                className="optidigi-assistant__send"
                aria-label="Send"
                title="Send"
                disabled={busy || Boolean(approval) || !draft.trim()}
              >
                <AssistantIcon name="send" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

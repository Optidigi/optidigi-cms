'use client'

import {
  Banner,
  Button,
  ConfirmationModal,
  FieldLabel,
  Pill,
  SelectInput,
  TextInput,
  useConfig,
  useModal,
  usePathname,
  useTranslation,
} from '@payloadcms/ui'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type {
  Approval,
  AssistantEvent,
  AssistantMessage,
  Connection,
  ModelProvider,
  ResponseDetail,
} from './protocol'
import { adminLabels, collectionLabels } from '../admin-workspace/i18n'
import { useAssistantConversation } from './conversation'
import { contextCollections, responseDetail } from './protocol'
import { AssistantIcon } from './Icon'
import './assistant.css'

type Tenant = { id: number; name: string; canManage: boolean }
type Status = { connected: boolean; model?: string; settings?: Connection }

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
  surface,
}: {
  endpoint: string
  tenant: Tenant
  surface: 'page' | 'drawer'
}) {
  const { i18n } = useTranslation()
  const label = adminLabels(i18n.language)
  const locale = i18n.language === 'nl' ? 'nl' : 'en'
  const [showConnection, setShowConnection] = useState(false)
  const [detail, setDetail] = useState<ResponseDetail>('standard')
  const [streaming, setStreaming] = useState(false)
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
      setBusy(false)
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
      const saved = (await response.json()) as Status
      setStatus({ ...saved, model: saved.settings?.model })
      form.reset()
      setShowConnection(false)
      setNotice(label('Model connected.', 'Model verbonden.'))
    })
  }

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!status?.connected || busy || approval || !draft.trim()) return
    void run(async (signal) => {
      const next: AssistantMessage[] = [...messages, { role: 'user', content: draft.trim() }]
      setMessages(next)
      setDraft('')
      setReply('')
      setStreaming(true)
      let answer = ''
      const recent = next.slice(-16)
      const history = recent[0].role === 'assistant' ? recent.slice(1) : recent
      try {
        const response = await action(
          endpoint,
          tenant.id,
          { action: 'chat', messages: history, context, detail },
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
      } finally {
        if (answer) setMessages([...next, { role: 'assistant', content: answer.slice(0, 6000) }])
        setReply('')
        setStreaming(false)
      }
    })
  }

  async function approveDelete(pending: Approval) {
    await run(async (signal) => {
      await action(endpoint, tenant.id, { action: 'approve', token: pending.token }, signal)
      setApproval(undefined)
      setNotice(label(`Deleted ${pending.label}.`, `${pending.label} is verwijderd.`))
    })
  }

  return (
    <div className="optidigi-assistant optidigi-assistant--chat">
      {surface === 'drawer' && (
        <div className="optidigi-assistant__scope">
          <Pill size="small">{tenant.name}</Pill>
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
      {!status && !error && (
        <p role="status">{label('Loading connection…', 'Verbinding laden…')}</p>
      )}
      {status && !status.connected && (
        <div className="optidigi-assistant-empty">
          <span className="optidigi-assistant-empty__icon">
            <AssistantIcon name="connect" />
          </span>
          <h2>{label('Connect a model', 'Verbind een model')}</h2>
          <p>
            {tenant.canManage
              ? label(
                  'Connect your provider below to use the assistant.',
                  'Verbind hieronder je provider om de assistent te gebruiken.',
                )
              : label(
                  'Ask a website admin to connect a model.',
                  'Vraag een websitebeheerder om een model te verbinden.',
                )}
          </p>
        </div>
      )}
      {status?.connected && (
        <>
          {messages.length === 0 && !reply && (
            <div className="optidigi-assistant-empty">
              <span className="optidigi-assistant-empty__icon">
                <AssistantIcon name="spark" />
              </span>
              <h2>{label('What are you working on?', 'Waar werk je aan?')}</h2>
              <p>
                {label(
                  'Ask about your content or tell me what to update.',
                  'Vraag iets over je inhoud of geef aan wat je wilt aanpassen.',
                )}
              </p>
            </div>
          )}
          {(messages.length > 0 || reply) && (
            <div
              className="optidigi-assistant__messages"
              role="log"
              aria-label={label('Conversation', 'Gesprek')}
            >
              {messages.map((message, index) => (
                <p key={index} data-role={message.role}>
                  <strong>
                    {message.role === 'user'
                      ? label('You', 'Jij')
                      : label('Assistant', 'Assistent')}
                  </strong>
                  {message.content}
                </p>
              ))}
              {reply && (
                <p data-role="assistant">
                  <strong>{label('Assistant', 'Assistent')}</strong>
                  {reply}
                </p>
              )}
            </div>
          )}
          {approval && (
            <section
              className="optidigi-assistant__approval"
              aria-label={label('Delete approval', 'Verwijdering bevestigen')}
            >
              <p>
                {label('Delete', 'Verwijder')} <strong>{approval.label}</strong> (
                {approval.collection} #{approval.id})?
              </p>
              <Button
                className="optidigi-assistant__review-delete"
                buttonStyle="secondary"
                disabled={busy}
                onClick={() => openModal(modalSlug)}
              >
                {label('Review delete', 'Verwijdering bekijken')}
              </Button>
              <Button
                className="optidigi-assistant__mobile-delete"
                buttonStyle="destructive"
                disabled={busy}
                onClick={() => void approveDelete(approval)}
              >
                {label('Confirm delete', 'Verwijdering bevestigen')}
              </Button>
              <Button
                buttonStyle="secondary"
                disabled={busy}
                onClick={() => setApproval(undefined)}
              >
                {label('Dismiss', 'Annuleren')}
              </Button>
              <ConfirmationModal
                modalSlug={modalSlug}
                heading={label('Delete this document?', 'Dit document verwijderen?')}
                body={
                  <>
                    {label('This will delete', 'Hiermee verwijder je')}{' '}
                    <strong>{approval.label}</strong> ({approval.collection} #{approval.id}).
                  </>
                }
                confirmLabel={label('Delete document', 'Document verwijderen')}
                onConfirm={() => approveDelete(approval)}
              />
            </section>
          )}
        </>
      )}
      {status && (
        <div className="optidigi-assistant__composer">
          <form onSubmit={ask} className="optidigi-assistant__prompt">
            {context && (
              <div className="optidigi-assistant__context">
                <span>
                  {collectionLabels[context.collection].singular[locale]} #{context.id}
                </span>
                <button
                  type="button"
                  onClick={() => setExcludedPath(pathname)}
                  aria-label={label('Remove document context', 'Documentcontext verwijderen')}
                >
                  <AssistantIcon name="close" />
                </button>
              </div>
            )}
            <label className="optidigi-assistant-sr-only" htmlFor="assistant-message">
              {label('Message', 'Bericht')}
            </label>
            <textarea
              id="assistant-message"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  if (status.connected && !busy && !approval && draft.trim())
                    event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={label('Ask about this website…', 'Stel een vraag over deze website…')}
              maxLength={6000}
              rows={2}
              disabled={!status.connected}
            />
            <div className="optidigi-assistant__composer-footer">
              <div className="optidigi-assistant__composer-options">
                {tenant.canManage ? (
                  <Button
                    buttonStyle="secondary"
                    type="button"
                    margin={false}
                    disabled={busy}
                    aria-expanded={showConnection}
                    aria-controls="assistant-connection"
                    onClick={() => setShowConnection(!showConnection)}
                  >
                    {status.model ??
                      status.settings?.model ??
                      label('Connect a model', 'Verbind een model')}
                  </Button>
                ) : (
                  status.connected && <Pill size="small">{status.model}</Pill>
                )}
                {status.connected && (
                  <select
                    className="optidigi-assistant__detail"
                    aria-label={label('Response detail', 'Antwoordlengte')}
                    value={detail}
                    disabled={busy}
                    onChange={(event) => {
                      const selected = responseDetail.find((value) => value === event.target.value)
                      if (selected) setDetail(selected)
                    }}
                  >
                    <option value="brief">{label('Brief', 'Kort')}</option>
                    <option value="standard">{label('Standard', 'Normaal')}</option>
                    <option value="detailed">{label('Detailed', 'Uitgebreid')}</option>
                  </select>
                )}
              </div>
              {streaming ? (
                <Button
                  type="button"
                  buttonStyle="secondary"
                  margin={false}
                  onClick={() => request.current?.abort()}
                >
                  {label('Stop', 'Stop')}
                </Button>
              ) : (
                <button
                  type="submit"
                  className="optidigi-assistant__send"
                  aria-label={label('Send message', 'Bericht versturen')}
                  title={label('Send message', 'Bericht versturen')}
                  disabled={!status.connected || busy || Boolean(approval) || !draft.trim()}
                >
                  <AssistantIcon name="send" />
                </button>
              )}
            </div>
          </form>
          {showConnection && tenant.canManage && status && (
            <form
              onSubmit={connect}
              className="optidigi-assistant__form optidigi-assistant__settings"
              id="assistant-connection"
            >
              <SelectInput
                label={label('Provider', 'Provider')}
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
                label={label('Model ID', 'Model-ID')}
                path="model"
                value={model}
                required
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setModel(event.currentTarget.value.slice(0, 150))
                }
              />
              {provider === 'openai-compatible' && (
                <TextInput
                  label={label('Provider base URL', 'Basis-URL van de provider')}
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
                <FieldLabel
                  label={label('API key', 'API-sleutel')}
                  htmlFor="assistant-api-key"
                  required
                />
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
                  {status.connected
                    ? label('Replace connection', 'Verbinding vervangen')
                    : label('Save connection', 'Verbinding opslaan')}
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
                        setShowConnection(false)
                        setNotice(label('Model disconnected.', 'Model losgekoppeld.'))
                      })
                    }
                  >
                    {label('Disconnect', 'Loskoppelen')}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai'
import { useParams } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'

export type ThreadSummary = { id: number; title?: string | null; archived?: boolean | null; updatedAt: string }
export type PageContext = { collection: string; id: number; title: string }
type BottomBar = false | 'small' | 'always'
// A model the chat can use: `key` is `connectionID:modelID`, as the chat endpoint expects.
export type ModelOption = { key: string; model: string; connectionID: string; connection: string }
type Setup = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; models: ModelOption[] }
type SettingsDoc = {
  connections?: { id?: string | null; label: string; hasKey?: boolean | null; models?: string[] | null }[] | null
  defaultModel?: string | null
}

// Enabled models of connections that have a key, in order; matches the endpoint's own choice.
function modelOptions(settings?: SettingsDoc): ModelOption[] {
  return (settings?.connections ?? []).flatMap((connection) =>
    connection.id && connection.hasKey
      ? (connection.models ?? []).map((model) => ({ key: `${connection.id}:${model}`, model, connectionID: connection.id!, connection: connection.label }))
      : [],
  )
}

type AssistantState = {
  site: number
  chat: Chat<UIMessage>
  thread?: number
  setup: Setup
  model?: string
  setModel: (model: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  context?: PageContext
  setContext: (context?: PageContext) => void
  // Set while the page shows its own sticky bottom bar: 'small' below the lg breakpoint (the editor's
  // save bar), 'always' when it shows one at every size (the editor beside the live preview).
  bottomBar: BottomBar
  setBottomBar: (value: BottomBar) => void
  threads: ThreadSummary[] | undefined
  refreshThreads: () => Promise<void>
  openThread: (id: number) => Promise<void>
  newChat: () => void
}

const AssistantContext = createContext<AssistantState | null>(null)

// One conversation per website, shared by the side panel and the full page.
export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ site?: string }>()
  const site = params.site ? Number(params.site) : undefined
  if (!site || !Number.isSafeInteger(site)) return children
  return (
    <SiteAssistant key={site} site={site}>
      {children}
    </SiteAssistant>
  )
}

type RequestState = { site: number; thread?: number; model?: string; context?: PageContext; language: string }

// Holds what the next request should carry. The chat transport reads it when a message is sent.
class RequestStore {
  // Each new chat gets a generation; responses from a replaced chat are ignored.
  private generation = 0
  constructor(private state: RequestState) {}
  nextGeneration() {
    return ++this.generation
  }
  isGeneration(generation: number) {
    return this.generation === generation
  }
  read = () => this.state
  update(changes: Partial<RequestState>) {
    this.state = { ...this.state, ...changes }
  }
}

function fetchThreads(site: number) {
  return api<{ docs: ThreadSummary[] }>(
    'assistant-threads' +
      query({
        'where[tenant][equals]': site,
        sort: '-updatedAt',
        limit: 50,
        depth: 0,
        'select[title]': true,
        'select[archived]': true,
        'select[updatedAt]': true,
      }),
  ).then(({ docs }) => docs, () => [])
}

// The transport reads the request state when a message is sent, so the chat isn't recreated when
// the model or page context changes. The server keeps the history; only the newest message is sent.
function createChat(
  messages: UIMessage[],
  request: () => RequestState,
  onThread: (id: number) => void,
  onFinish: () => void,
  isCurrent: () => boolean = () => true,
) {
  return new Chat<UIMessage>({
    messages,
    transport: new DefaultChatTransport({
      api: '/api/assistant/chat',
      prepareSendMessagesRequest: ({ messages: all }) => ({
        body: {
          site: request().site,
          thread: request().thread,
          model: request().model,
          locale: request().language,
          context: request().context,
          message: all.at(-1),
        },
      }),
      fetch: async (input, init) => {
        const response = await fetch(input, init)
        const id = Number(response.headers.get('x-assistant-thread'))
        if (id && id !== request().thread && isCurrent()) onThread(id)
        return response
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish,
  })
}

function SiteAssistant({ site, children }: { site: number; children: React.ReactNode }) {
  const { language } = useI18n()
  const [setup, setSetup] = useState<Setup>({ state: 'loading' })
  const [model, setModel] = useState<string>()
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<PageContext>()
  const [bottomBar, setBottomBar] = useState<BottomBar>(false)
  const [threads, setThreads] = useState<ThreadSummary[]>()
  const [thread, setThread] = useState<number>()
  const [request] = useState(() => new RequestStore({ site, language }))
  useEffect(() => {
    request.update({ site, thread, model, context, language })
  }, [request, site, thread, model, context, language])

  const refreshThreads = useCallback(async () => setThreads(await fetchThreads(site)), [site])
  const readRequest = request.read
  const adoptThread = useCallback(
    (id: number) => {
      request.update({ thread: id })
      setThread(id)
    },
    [request],
  )
  const [chat, setChat] = useState(() => createChat([], readRequest, adoptThread, () => void refreshThreads()))

  useEffect(() => {
    let current = true
    api<{ docs: SettingsDoc[] }>('assistant-settings' + query({ 'where[tenant][equals]': site, limit: 1, depth: 0 })).then(
      ({ docs: [settings] }) => {
        if (!current) return
        const models = modelOptions(settings)
        setSetup(models.length ? { state: 'ready', models } : { state: 'missing' })
        setModel((models.find(({ key }) => key === settings?.defaultModel) ?? models[0])?.key)
      },
      () => current && setSetup({ state: 'missing' }),
    )
    fetchThreads(site).then((docs) => current && setThreads(docs))
    return () => {
      current = false
    }
  }, [site])

  const replaceChat = useCallback(
    (messages: UIMessage[], thread?: number) => {
      chat.stop()
      const generation = request.nextGeneration()
      request.update({ thread })
      setThread(thread)
      setChat(
        createChat(messages, readRequest, adoptThread, () => void refreshThreads(), () => request.isGeneration(generation)),
      )
    },
    [chat, request, readRequest, adoptThread, refreshThreads],
  )

  const openThread = useCallback(
    async (id: number) => {
      const doc = await api<{ messages?: UIMessage[] | null }>(`assistant-threads/${id}${query({ depth: 0 })}`)
      replaceChat(doc.messages ?? [], id)
    },
    [replaceChat],
  )

  const newChat = useCallback(() => replaceChat([]), [replaceChat])

  const value = useMemo(
    () => ({
      site, chat, thread, setup, model, setModel, open, setOpen, context, setContext, bottomBar, setBottomBar,
      threads, refreshThreads, openThread, newChat,
    }),
    [site, chat, thread, setup, model, open, context, bottomBar, threads, refreshThreads, openThread, newChat],
  )
  return <AssistantContext value={value}>{children}</AssistantContext>
}

export function useAssistant() {
  return useContext(AssistantContext)
}

// Lets a page tell the assistant which document the editor is looking at.
export function AssistantPageContext({ value }: { value?: PageContext }) {
  const assistant = useAssistant()
  const setContext = assistant?.setContext
  const key = value ? `${value.collection}:${value.id}:${value.title}` : ''
  useEffect(() => {
    setContext?.(value)
    return () => setContext?.(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compare by key
  }, [setContext, key])
  return null
}

// Marks that the page has its own sticky bottom bar, so the floating AI bar steps aside for it.
export function AssistantBottomBar({ always = false }: { always?: boolean }) {
  const setBottomBar = useAssistant()?.setBottomBar
  useEffect(() => {
    setBottomBar?.(always ? 'always' : 'small')
    return () => setBottomBar?.(false)
  }, [setBottomBar, always])
  return null
}

'use client'

import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai'
import { useParams } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, query } from '../client/api'
import { useI18n } from '../client/i18n-provider'

export type ThreadSummary = { id: number; title?: string | null; archived?: boolean | null; updatedAt: string }
export type PageContext = { collection: string; id: number; title: string }
type Setup = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; models: string[] }

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
  constructor(private state: RequestState) {}
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
        if (id && id !== request().thread) onThread(id)
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
    api<{ docs: { models?: string[] | null }[] }>(
      'assistant-settings' + query({ 'where[tenant][equals]': site, limit: 1, depth: 0 }),
    ).then(
      ({ docs: [settings] }) => {
        if (!current) return
        const models = settings?.models ?? []
        setSetup(models.length ? { state: 'ready', models } : { state: 'missing' })
        setModel(models[0])
      },
      () => current && setSetup({ state: 'missing' }),
    )
    fetchThreads(site).then((docs) => current && setThreads(docs))
    return () => {
      current = false
    }
  }, [site])

  const openThread = useCallback(
    async (id: number) => {
      const doc = await api<{ messages?: UIMessage[] | null }>(`assistant-threads/${id}${query({ depth: 0 })}`)
      request.update({ thread: id })
      setThread(id)
      setChat(createChat(doc.messages ?? [], readRequest, adoptThread, () => void refreshThreads()))
    },
    [request, readRequest, adoptThread, refreshThreads],
  )

  const newChat = useCallback(() => {
    request.update({ thread: undefined })
    setThread(undefined)
    setChat(createChat([], readRequest, adoptThread, () => void refreshThreads()))
  }, [request, readRequest, adoptThread, refreshThreads])

  const value = useMemo(
    () => ({
      site, chat, thread, setup, model, setModel, open, setOpen, context, setContext,
      threads, refreshThreads, openThread, newChat,
    }),
    [site, chat, thread, setup, model, open, context, threads, refreshThreads, openThread, newChat],
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

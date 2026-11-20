'use client'

import { Chat, useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AssistantUIMessage,
  Approval,
  Connection,
  ResponseDetail,
  contextCollections,
} from './protocol'

export type AssistantContext = { collection: (typeof contextCollections)[number]; id: number }
export type AssistantTenant = { id: number; name: string; canManage: boolean }
export type Thread = { id: number; title: string; updatedAt: string; archived: boolean }
type DraftResult = { id: number; locale: 'nl' | 'en'; preview?: string | null }
export type ChatMessage = AssistantUIMessage
type Capabilities = { efforts: string[]; attachmentTypes: string[] }
type CatalogSettings = {
  models: { model: string; label?: string }[]
  defaultModel?: string
  detail?: ResponseDetail
}
export type AssistantModel = { id: string; label: string; capabilities: Capabilities }
type Status = {
  connected: boolean
  model?: string
  settings?: Connection & { catalog?: CatalogSettings }
  capabilities?: Capabilities
  models?: AssistantModel[]
  defaultModelID?: string
  defaultDetail?: ResponseDetail
}
type ThreadPage = { threads: Thread[]; nextPage?: number | null }
type Attachment = FileUIPart & { uploadID?: number }

const endpoint = '/api/assistant'

async function request<T>(tenant: number, data: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, tenant }),
    signal,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) {
    throw new Error(
      typeof result?.error === 'string' ? result.error : 'Het verzoek kon niet worden uitgevoerd.',
    )
  }
  return result as T
}

export function threadHref(route: string, thread?: number) {
  const [path, query] = route.split('?')
  const params = new URLSearchParams(query)
  if (thread) params.set('thread', String(thread))
  else params.delete('thread')
  return path + (params.size ? '?' + params : '')
}

function syncThreadURL(thread?: number) {
  if (/^\/admin\/\d+\/assistant\/?$/.test(window.location.pathname)) {
    window.history.replaceState(
      null,
      '',
      threadHref(window.location.pathname + window.location.search, thread),
    )
  }
}

export function useAssistant({
  tenant,
  document,
  locale,
}: {
  tenant: AssistantTenant
  document?: AssistantContext
  locale: 'nl' | 'en'
}) {
  const tenantID = tenant.id
  const queryThread = Number(useSearchParams().get('thread'))
  const [model, setModel] = useState<Status>()
  const [selectedModelID, setSelectedModelID] = useState<string>()
  const selectedModel =
    model?.models?.find(({ id }) => id === selectedModelID) ??
    model?.models?.find(({ id }) => id === model.defaultModelID)
  const capabilities = selectedModel?.capabilities ?? model?.capabilities
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [detail, setDetail] = useState<ResponseDetail>('standard')
  const [effort, setEffort] = useState('default')
  const [approval, setApproval] = useState<Approval>()
  const [result, setResult] = useState<DraftResult>()
  const [notice, setNotice] = useState('')
  const [operationError, setOperationError] = useState('')
  const [operation, setOperation] = useState<
    'send' | 'upload' | 'settings' | 'approval' | 'thread'
  >()
  const operationRef = useRef<typeof operation>(undefined)
  const [thread, setThread] = useState<Thread>()
  const threadRef = useRef<Thread | undefined>(undefined)
  const latestThreadRequest = useRef(0)
  const [history, setHistory] = useState<Thread[]>([])
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [historyQuery, setHistoryQuery] = useState('')
  const [archived, setArchived] = useState(false)
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const historyRevision = useRef(0)
  const [chat] = useState(
    () =>
      new Chat<ChatMessage>({
        id: 'optidigi-tenant-' + tenantID,
        transport: new DefaultChatTransport({
          api: endpoint,
          prepareSendMessagesRequest: ({ body, messages }) => ({
            body: { ...body, messages: messages.slice(-1) },
          }),
        }),
        onData(part) {
          if (part.type === 'data-approval') setApproval(part.data)
          if (part.type === 'data-draft-saved') setResult(part.data)
        },
      }),
  )
  const session = useChat({ chat, throttle: 40 })
  const { setMessages } = session
  const streaming = session.status === 'submitted' || session.status === 'streaming'
  const waitingForThread =
    Number.isSafeInteger(queryThread) && queryThread > 0 && thread?.id !== queryThread
  const busy = Boolean(operation) || streaming || waitingForThread

  const loadHistory = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      const revision = ++historyRevision.current
      if (page === 1) {
        setHistoryStatus('loading')
        setLoadingMore(false)
      } else setLoadingMore(true)
      try {
        const data = await request<ThreadPage>(
          tenantID,
          {
            action: 'thread-list',
            query: historyQuery.trim() || undefined,
            archived,
            page,
          },
          signal,
        )
        if (revision !== historyRevision.current || signal?.aborted) return
        setHistory((previous) =>
          page === 1
            ? data.threads
            : [
                ...previous,
                ...data.threads.filter((item) => !previous.some(({ id }) => id === item.id)),
              ],
        )
        setNextPage(data.nextPage ?? null)
        setHistoryStatus('ready')
      } catch {
        if (revision !== historyRevision.current || signal?.aborted) return
        if (page === 1) setHistoryStatus('error')
        else setOperationError('Meer gesprekken laden is mislukt.')
      } finally {
        if (revision === historyRevision.current && !signal?.aborted) setLoadingMore(false)
      }
    },
    [tenantID, historyQuery, archived],
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void loadHistory(1, controller.signal), 180)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [loadHistory])

  const [modelLoadAttempt, setModelLoadAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void request<Status>(tenantID, { action: 'status' }, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        setModel(value)
        setDetail(value.defaultDetail ?? 'standard')
        setModelStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setModelStatus('error')
      })
    return () => controller.abort()
  }, [tenantID, modelLoadAttempt])

  function run(kind: NonNullable<typeof operation>, task: () => Promise<void>) {
    if (operationRef.current || chat.status === 'submitted' || chat.status === 'streaming') return
    operationRef.current = kind
    setOperation(kind)
    setNotice('')
    setOperationError('')
    void task()
      .catch((error: unknown) => {
        setOperationError(error instanceof Error ? error.message : 'Het verzoek is mislukt.')
      })
      .finally(() => {
        operationRef.current = undefined
        setOperation(undefined)
      })
  }

  const resetConversation = useCallback(
    (next?: Thread, messages: ChatMessage[] = []) => {
      threadRef.current = next
      setThread(next)
      setMessages(messages)
      chat.clearError()
      setInput('')
      setFiles([])
      setApproval(undefined)
      setResult(undefined)
      setNotice('')
    },
    [chat, setMessages],
  )

  const openThread = useCallback(
    async (id: number, signal?: AbortSignal) => {
      if (
        id === threadRef.current?.id ||
        chat.status === 'submitted' ||
        chat.status === 'streaming'
      )
        return
      const sequence = ++latestThreadRequest.current
      const data = await request<{ thread: Thread; messages: ChatMessage[] }>(
        tenantID,
        {
          action: 'thread-read',
          thread: id,
        },
        signal,
      )
      if (sequence !== latestThreadRequest.current || signal?.aborted) return
      resetConversation(data.thread, data.messages)
      syncThreadURL(id)
    },
    [chat, resetConversation, tenantID],
  )

  useEffect(() => {
    if (
      !Number.isSafeInteger(queryThread) ||
      queryThread <= 0 ||
      threadRef.current?.id === queryThread
    )
      return
    const controller = new AbortController()
    void openThread(queryThread, controller.signal).catch(() => {
      if (!controller.signal.aborted) {
        setOperationError('Dit gesprek is niet beschikbaar.')
        syncThreadURL()
      }
    })
    return () => controller.abort()
  }, [openThread, queryThread])

  async function ensureThread() {
    if (threadRef.current) return threadRef.current
    const { thread: created } = await request<{ thread: Thread }>(tenantID, {
      action: 'thread-create',
    })
    threadRef.current = created
    setThread(created)
    syncThreadURL(created.id)
    void loadHistory()
    return created
  }

  function selectThread(id: number) {
    run('thread', () => openThread(id))
  }

  function newThread() {
    if (busy) return
    latestThreadRequest.current += 1
    resetConversation()
    syncThreadURL()
    setOperationError('')
  }

  function updateThread(id: number, changes: { title?: string; archived?: boolean } | 'delete') {
    run('thread', async () => {
      const result = await request<{ thread?: Thread }>(
        tenantID,
        changes === 'delete'
          ? { action: 'thread-delete', thread: id }
          : { action: 'thread-update', thread: id, ...changes },
      )
      if (threadRef.current?.id === id) {
        if (changes === 'delete' || changes.archived) {
          resetConversation()
          syncThreadURL()
        } else if (result.thread) {
          threadRef.current = result.thread
          setThread(result.thread)
        }
      }
      void loadHistory()
    })
  }

  function send() {
    if (
      busy ||
      !model?.connected ||
      approval ||
      (!input.trim() && !files.length) ||
      thread?.archived
    )
      return
    const text = input.trim()
    const attachments = files
    run('send', async () => {
      const current = await ensureThread()
      setInput('')
      setFiles([])
      setResult(undefined)
      try {
        await chat.sendMessage(
          {
            text,
            files: attachments.map(({ uploadID: _uploadID, ...file }) => file),
          },
          {
            body: {
              action: 'chat-v2',
              tenant: tenantID,
              thread: current.id,
              modelID: selectedModel?.id,
              context: document,
              locale,
              detail,
              effort: effort === 'default' ? undefined : effort,
            },
          },
        )
      } catch {
        setOperationError('Het bericht kon niet worden verstuurd.')
        setInput((value) => value || text)
        setFiles((value) => (value.length ? value : attachments))
      } finally {
        if (chat.status === 'error') {
          setInput((value) => value || text)
          setFiles((value) => (value.length ? value : attachments))
        }
        void loadHistory()
      }
    })
  }

  function upload(selection: FileList | null) {
    if (!selection?.length || !model?.connected || thread?.archived) return
    const selected = Array.from(selection)
    const types = capabilities?.attachmentTypes ?? []
    if (selected.length + files.length > 3) {
      setOperationError('Voeg maximaal drie bestanden toe.')
      return
    }
    if (
      selected.some(
        (file) => !types.includes(file.type) || !file.size || file.size > 4 * 1024 * 1024,
      )
    ) {
      setOperationError('Kies een ondersteund bestand van maximaal 4 MB.')
      return
    }
    run('upload', async () => {
      const current = await ensureThread()
      for (const file of selected) {
        const form = new FormData()
        form.set('file', file)
        form.set('_payload', JSON.stringify({ thread: current.id }))
        const response = await fetch('/api/assistant-uploads', { method: 'POST', body: form })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.doc?.url) throw new Error('Bestand uploaden is mislukt.')
        const { id, filename, mimeType, url } = data.doc as {
          id: number
          filename: string
          mimeType: string
          url: string
        }
        setFiles((previous) => [
          ...previous,
          {
            type: 'file',
            url: new URL(url, window.location.origin).pathname,
            filename,
            mediaType: mimeType,
            uploadID: id,
          },
        ])
      }
    })
  }

  function attachMedia(asset: FileUIPart) {
    if (!model?.connected || thread?.archived || busy) return
    if (!capabilities?.attachmentTypes.includes(asset.mediaType) || files.length >= 3) {
      setOperationError('Dit bestand past niet bij het huidige model of de limiet is bereikt.')
      return
    }
    if (!files.some(({ url }) => url === asset.url)) setFiles((previous) => [...previous, asset])
  }

  return {
    model,
    selectedModel,
    capabilities,
    selectModel: (id: string) => {
      const next = model?.models?.find((entry) => entry.id === id)
      if (
        !next ||
        busy ||
        files.some(({ mediaType }) => !next.capabilities.attachmentTypes.includes(mediaType))
      )
        return
      setSelectedModelID(id)
      setEffort('default')
    },
    configureModels: (options: CatalogSettings) =>
      run('settings', async () => {
        await request(tenantID, { action: 'configure-models', options })
        const status = await request<Status>(tenantID, { action: 'status' })
        setModel(status)
        setDetail(status.defaultDetail ?? 'standard')
        setSelectedModelID(undefined)
        setEffort('default')
        setNotice('Wijzigingen opgeslagen.')
      }),
    modelStatus,
    reloadModel: () => {
      setModelStatus('loading')
      setModelLoadAttempt((attempt) => attempt + 1)
    },
    input,
    setInput,
    detail,
    setDetail,
    effort,
    setEffort,
    files,
    messages: session.messages,
    status: session.status,
    busy,
    operation,
    streaming,
    approval,
    result,
    notice,
    history,
    historyStatus,
    historyQuery,
    setHistoryQuery,
    archived,
    setArchived,
    nextPage,
    loadingMore,
    thread,
    selectThread,
    newThread,
    updateThread,
    loadMore: () => {
      if (nextPage && !loadingMore) void loadHistory(nextPage)
    },
    reloadHistory: () => void loadHistory(),
    reloadThread: () => {
      const id = threadRef.current?.id
      if (!id) return
      run('thread', async () => {
        const saved = await request<{ thread: Thread; messages: ChatMessage[] }>(tenantID, {
          action: 'thread-read',
          thread: id,
        })
        threadRef.current = saved.thread
        setThread(saved.thread)
        setMessages(saved.messages)
        chat.clearError()
        setResult(undefined)
      })
    },
    error:
      operationError ||
      (session.status === 'error'
        ? 'Het antwoord is onderbroken. Controleer het gesprek voordat je opnieuw verstuurt.'
        : ''),
    canRetry: Boolean(
      thread &&
      !thread.archived &&
      model?.connected &&
      !approval &&
      !busy &&
      session.messages.at(-1)?.role === 'user',
    ),
    retry: () => {
      const last = session.messages.at(-1)
      if (
        !thread ||
        thread.archived ||
        !model?.connected ||
        approval ||
        busy ||
        last?.role !== 'user'
      )
        return
      run('send', async () => {
        await chat.sendMessage(undefined, {
          body: {
            action: 'chat-v2',
            tenant: tenantID,
            thread: thread.id,
            modelID: selectedModel?.id,
            retryMessageID: last.id,
            locale,
            detail,
            effort: effort === 'default' ? undefined : effort,
          },
        })
        if (chat.status !== 'error') {
          setInput('')
          setFiles([])
          void loadHistory()
        }
      })
    },
    send,
    upload,
    attachMedia,
    removeFile: (index: number) =>
      setFiles((previous) => previous.filter((_, position) => position !== index)),
    stop: () => {
      void session.stop()
      setNotice('Antwoord gestopt.')
    },
    connect: (form: FormData, onSaved: () => void) =>
      run('settings', async () => {
        const value = await request<Status>(tenantID, {
          action: 'connect',
          provider: form.get('provider'),
          model: form.get('model'),
          apiKey: form.get('apiKey'),
          baseURL: form.get('baseURL') || undefined,
        })
        setModel(await request<Status>(tenantID, { action: 'status' }).catch(() => value))
        setModelStatus('ready')
        setEffort('default')
        setNotice('Model verbonden.')
        onSaved()
      }),
    testConnection: () =>
      run('settings', async () => {
        await request(tenantID, { action: 'test-connection' })
        setNotice('De verbinding werkt.')
      }),
    disconnect: () =>
      run('settings', async () => {
        await request(tenantID, { action: 'disconnect' })
        setModel({ connected: false })
        setEffort('default')
        setNotice('Model losgekoppeld.')
      }),
    reject: () => {
      setApproval(undefined)
      setNotice('Verwijdering geannuleerd.')
    },
    approve: () => {
      if (!approval || !tenant.canManage) return
      run('approval', async () => {
        await request(tenantID, { action: 'approve', token: approval.token })
        setApproval(undefined)
        setNotice('Document verwijderd.')
      })
    },
  }
}

export type AssistantController = ReturnType<typeof useAssistant>

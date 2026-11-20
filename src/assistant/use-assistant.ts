'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  Approval,
  AssistantEvent,
  AssistantMessage,
  Connection,
  ModelProvider,
  ResponseDetail,
  contextCollections,
} from './protocol'

export type AssistantContext = {
  collection: (typeof contextCollections)[number]
  id: number
}
export type AssistantTenant = { id: number; name: string; canManage: boolean }
type ModelStatus = { connected: boolean; model?: string; settings?: Connection }
type Turn = AssistantMessage & { id: string }
type Result = Extract<AssistantEvent, { type: 'draft-saved' }>

async function request(endpoint: string, tenant: number, data: object, signal: AbortSignal) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, tenant }),
    signal,
  })
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}))
    throw new Error(typeof error === 'string' ? error : 'De assistent is niet beschikbaar.')
  }
  return response
}

async function readEvents(response: Response, receive: (event: AssistantEvent) => void) {
  if (!response.body) throw new Error('Geen antwoord ontvangen.')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let pending = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      pending += value
      let end = pending.indexOf('\n\n')
      while (end !== -1) {
        const frame = pending.slice(0, end)
        pending = pending.slice(end + 2)
        if (frame.startsWith('data: ')) receive(JSON.parse(frame.slice(6)) as AssistantEvent)
        end = pending.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function useAssistant({
  endpoint,
  tenant,
  document,
  locale,
}: {
  endpoint: string
  tenant: AssistantTenant
  document?: AssistantContext
  locale: 'nl' | 'en'
}) {
  const [model, setModel] = useState<ModelStatus>()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [detail, setDetail] = useState<ResponseDetail>('standard')
  const [approval, setApproval] = useState<Approval>()
  const [result, setResult] = useState<Result>()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'chat' | 'settings' | 'approval'>()
  const active = useRef<AbortController | null>(null)
  const id = tenant.id

  useEffect(() => {
    const status = new AbortController()
    void request(endpoint, id, { action: 'status' }, status.signal)
      .then((response) => response.json())
      .then((value: ModelStatus) => setModel(value))
      .catch(() => {
        if (!status.signal.aborted) setError('De modelverbinding kon niet worden geladen.')
      })
    return () => {
      status.abort()
      active.current?.abort()
    }
  }, [endpoint, id])

  async function run(
    operation: NonNullable<typeof busy>,
    work: (signal: AbortSignal) => Promise<void>,
  ) {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setBusy(operation)
    setError('')
    setNotice('')
    try {
      await work(controller.signal)
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Verzoek mislukt.')
    } finally {
      if (active.current === controller) {
        active.current = null
        setBusy(undefined)
      }
    }
  }

  function send() {
    if (!model?.connected || approval || active.current || !input.trim()) return
    const user: Turn = { id: crypto.randomUUID(), role: 'user', content: input.trim() }
    const reply: Turn = { id: crypto.randomUUID(), role: 'assistant', content: '' }
    const next = [...turns, user]
    const recent = next.slice(-24)
    setTurns(next)
    setResult(undefined)
    setInput('')
    void run('chat', async (signal) => {
      const response = await request(
        endpoint,
        id,
        {
          action: 'chat',
          messages: recent
            .slice(recent.findIndex(({ role }) => role === 'user'))
            .map(({ role, content }) => ({ role, content: content.slice(0, 6000) })),
          context: document,
          locale,
          detail,
        },
        signal,
      )
      await readEvents(response, (event) => {
        if (event.type === 'text') {
          reply.content += event.text
          setTurns([...next, { ...reply }])
        }
        if (event.type === 'approval') setApproval(event.approval)
        if (event.type === 'draft-saved') setResult(event)
        if (event.type === 'error') setError(event.message)
      })
    })
  }

  async function connect(form: FormData, signal: AbortSignal) {
    const response = await request(
      endpoint,
      id,
      {
        action: 'connect',
        provider: form.get('provider') as ModelProvider,
        model: form.get('model'),
        apiKey: form.get('apiKey'),
        baseURL: form.get('baseURL') || undefined,
      },
      signal,
    )
    setModel(await response.json())
    setNotice('Model verbonden.')
  }

  return {
    model,
    turns,
    input,
    setInput,
    detail,
    setDetail,
    approval,
    result,
    notice,
    error,
    busy,
    send,
    stop: () => active.current?.abort(),
    reset: () => {
      if (active.current) return
      setTurns([])
      setInput('')
      setApproval(undefined)
      setResult(undefined)
      setNotice('')
      setError('')
    },
    connect: (form: FormData, onSaved: () => void) =>
      run('settings', async (signal) => {
        await connect(form, signal)
        onSaved()
      }),
    disconnect: () =>
      run('settings', async (signal) => {
        await request(endpoint, id, { action: 'disconnect' }, signal)
        setModel({ connected: false })
        setNotice('Model losgekoppeld.')
      }),
    reject: () => {
      setApproval(undefined)
      setNotice('Verwijdering geannuleerd.')
    },
    approve: () => {
      if (!approval || !tenant.canManage) return
      void run('approval', async (signal) => {
        await request(endpoint, id, { action: 'approve', token: approval.token }, signal)
        setApproval(undefined)
        setNotice('Document verwijderd.')
      })
    },
  }
}

export type AssistantController = ReturnType<typeof useAssistant>

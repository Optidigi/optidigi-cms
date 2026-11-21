'use client'

import { useChat } from '@ai-sdk/react'
import { getToolName, isToolUIPart, type FileUIPart, type UIMessage } from 'ai'
import {
  ArrowUpIcon,
  SparklesIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  SquareIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { CodeBlock, CodeBlockContent } from '@/components/ui/code-block'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { Message, MessageContent, MessageFooter } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Spinner } from '@/components/ui/spinner'
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '@/components/ui/trace'
import { cn } from '@/lib/utils'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import type { MessageKey } from '../i18n'
import { ApprovalCard } from './approval-card'
import { useAssistant } from './assistant-context'
import { toolLabel } from './tool-label'

// Chat composition from the shadcn AI Elements docs (Chat, Message, Tool, Confirmation,
// Prompt Input, Model Selector, Suggestion), with state from the AI SDK's useChat.
export function Conversation({ className, compact = false }: { className?: string; compact?: boolean }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const { messages, sendMessage, regenerate, stop, status, error, addToolApprovalResponse } = useChat({ chat: assistant!.chat })
  const [draft, setDraft] = useState<{ text: string; files?: FileUIPart[]; messageId?: string; key: number }>({ text: '', key: 0 })
  if (!assistant) return null
  const { setup, context } = assistant
  const busy = status === 'submitted' || status === 'streaming'
  // A pending approval must be answered before the conversation continues.
  const awaitingApproval = messages.at(-1)?.parts.some((part) => isToolUIPart(part) && part.state === 'approval-requested') ?? false

  if (setup.state === 'missing') {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparklesIcon />
          </EmptyMedia>
          <EmptyTitle>{t('notSetUp')}</EmptyTitle>
          <EmptyDescription>{t('notSetUpDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const suggestions: MessageKey[] = context
    ? ['suggestionDocument', 'suggestionSeo']
    : ['suggestionDrafts', 'suggestionSeo', 'suggestionArticle']

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className={cn('mx-auto w-full max-w-3xl gap-6 p-4', compact && 'px-3')}>
              {messages.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SparklesIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t('assistantTitle')}</EmptyTitle>
                    <EmptyDescription>{t('assistantDescription')}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {messages.map((message, index) => (
                <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === 'user'}>
                  <ChatMessage
                    message={message}
                    streaming={busy && index === messages.length - 1}
                    onRetry={() => regenerate({ messageId: message.id })}
                    onEdit={(text, files) => setDraft((current) => ({ text, files, messageId: message.id, key: current.key + 1 }))}
                    onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
                    canAct={!busy}
                  />
                </MessageScrollerItem>
              ))}
              {status === 'submitted' && <Spinner className="text-muted-foreground" />}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{serverMessage(error) ?? t('assistantError')}</AlertDescription>
                </Alert>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className={cn('mx-auto flex w-full max-w-3xl flex-col gap-2 p-4 pt-0', compact && 'px-3')}>
        {messages.length === 0 && (
          <div className="flex scroll-fade-x scrollbar-none gap-2 overflow-x-auto overscroll-x-contain">
            {suggestions.map((key) => (
              <Button key={key} variant="outline" size="sm" className="shrink-0" onClick={() => sendMessage({ text: t(key) })}>
                {t(key)}
              </Button>
            ))}
          </div>
        )}
        <Composer
          key={draft.key}
          initialText={draft.text}
          initialFiles={draft.files}
          busy={busy}
          locked={awaitingApproval}
          onStop={stop}
          onSend={async (text, files) => {
            const messageId = draft.messageId
            setDraft((current) => ({ text: '', key: current.key + 1 }))
            await sendMessage(messageId ? { text, files, messageId } : { text, files })
          }}
        />
      </div>
    </div>
  )
}

// The endpoint answers errors as JSON { error }; show that text when it's there.
function serverMessage(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown }
    return typeof parsed.error === 'string' ? parsed.error : undefined
  } catch {
    return undefined
  }
}

function textOf(message: UIMessage) {
  return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n')
}

function ChatMessage({
  message,
  streaming,
  onRetry,
  onEdit,
  onApprove,
  canAct,
}: {
  message: UIMessage
  streaming: boolean
  onRetry: () => void
  onEdit: (text: string, files: FileUIPart[]) => void
  onApprove: (id: string, approved: boolean) => void
  canAct: boolean
}) {
  const { t, language } = useI18n()
  const [copied, setCopied] = useState(false)
  const text = textOf(message)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(t('copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const files = message.parts.filter((part): part is FileUIPart => part.type === 'file')
  if (message.role === 'user') {
    return (
      <Message align="end">
        <MessageContent>
          {files.length > 0 && (
            <AttachmentGroup>
              {files.map((file, index) => (
                <Attachment key={index} size="sm">
                  <AttachmentMedia variant="image">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private chat file served by Payload */}
                    <img src={file.url} alt={file.filename ?? ''} />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.filename}</AttachmentTitle>
                  </AttachmentContent>
                </Attachment>
              ))}
            </AttachmentGroup>
          )}
          <Bubble align="end" variant="muted">
            <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
          </Bubble>
          <MessageFooter>
            <Button variant="ghost" size="icon-sm" aria-label={t('editMessage')} disabled={!canAct} onClick={() => onEdit(text, files)}>
              <PencilIcon />
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
    )
  }

  const model = (message.metadata as { model?: string } | undefined)?.model
  return (
    <Message>
      <MessageContent className="gap-3">
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <Streamdown key={index} className="text-sm" isAnimating={streaming}>
                {part.text}
              </Streamdown>
            )
          }
          if (isToolUIPart(part)) {
            const name = getToolName(part)
            if (part.state === 'approval-requested') {
              return (
                <ApprovalCard
                  key={index}
                  tool={name}
                  input={part.input}
                  disabled={!canAct}
                  onAnswer={(approved) => onApprove(part.approval.id, approved)}
                />
              )
            }
            const denied = part.state === 'output-denied' || (part.state === 'approval-responded' && !part.approval.approved)
            if (denied) {
              return (
                <Trace key={index}>
                  <TraceLine>
                    <TraceIcon>
                      <WrenchIcon />
                    </TraceIcon>
                    <TraceTitle>{toolLabel(name, part.input, 'denied', t, language)}</TraceTitle>
                  </TraceLine>
                </Trace>
              )
            }
            if (part.state === 'output-available' || part.state === 'output-error') {
              const failed = part.state === 'output-error'
              return (
                <Trace key={index}>
                  <TraceCollapsible>
                    <TraceCollapsibleTrigger>
                      <TraceLine status={failed ? 'error' : undefined}>
                        <TraceIcon>
                          <WrenchIcon />
                        </TraceIcon>
                        <TraceTitle>{toolLabel(name, part.input, failed ? 'failed' : 'done', t, language)}</TraceTitle>
                      </TraceLine>
                    </TraceCollapsibleTrigger>
                    <TraceCollapsibleContent>
                      <CodeBlock size="sm">
                        <CodeBlockContent wrap className="max-h-64">
                          {failed ? part.errorText : JSON.stringify(part.output, null, 2)}
                        </CodeBlockContent>
                      </CodeBlock>
                    </TraceCollapsibleContent>
                  </TraceCollapsible>
                </Trace>
              )
            }
            return (
              <Trace key={index}>
                <TraceLine status={streaming ? 'running' : 'error'}>
                  <TraceIcon>
                    <WrenchIcon />
                  </TraceIcon>
                  <TraceTitle>{toolLabel(name, part.input, streaming ? 'running' : 'failed', t, language)}</TraceTitle>
                </TraceLine>
              </Trace>
            )
          }
          return null
        })}
        {!streaming && text && (
          <MessageFooter>
            <Button variant="ghost" size="icon-sm" aria-label={t('copy')} onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t('retry')} disabled={!canAct} onClick={onRetry}>
              <RefreshCcwIcon />
            </Button>
            {model && <Badge variant="outline">{model}</Badge>}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

type Upload = { key: string; name: string; state: 'uploading' | 'done' | 'error'; file?: FileUIPart; id?: number }

function Composer({
  initialText,
  initialFiles,
  busy,
  locked,
  onSend,
  onStop,
}: {
  initialText: string
  initialFiles?: FileUIPart[]
  busy: boolean
  locked: boolean
  onSend: (text: string, files: FileUIPart[]) => Promise<void>
  onStop: () => void
}) {
  const assistant = useAssistant()!
  const { t } = useI18n()
  const [text, setText] = useState(initialText)
  const [uploads, setUploads] = useState<Upload[]>(
    (initialFiles ?? []).map((file, index) => ({ key: `initial-${index}`, name: file.filename ?? '', state: 'done', file })),
  )
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const models = assistant.setup.state === 'ready' ? assistant.setup.models : []
  const selected = models.find(({ key }) => key === assistant.model)
  const connections = [...new Map(models.map((option) => [option.connectionID, option.connection]))]
  const ready = uploads.every(({ state }) => state !== 'uploading')
  const canSend = Boolean(text.trim()) && ready && !busy && !locked && assistant.setup.state === 'ready'

  // Files go to the private assistant-files collection; the chat only carries their URL.
  async function attach(files: FileList | File[]) {
    for (const file of [...files].filter((candidate) => candidate.type.startsWith('image/')).slice(0, 4)) {
      const key = `${Date.now()}-${file.name}`
      setUploads((current) => [...current, { key, name: file.name, state: 'uploading' }])
      const body = new FormData()
      body.append('file', file)
      body.append('_payload', JSON.stringify({ tenant: assistant.site }))
      try {
        const { doc } = await api<{ doc: { id: number; url: string; mimeType: string; filename: string } }>('assistant-files', { method: 'POST', body })
        const url = doc.url.startsWith('http') ? new URL(doc.url).pathname : doc.url
        setUploads((current) =>
          current.map((item) =>
            item.key === key ? { ...item, state: 'done', id: doc.id, file: { type: 'file', mediaType: doc.mimeType, url, filename: doc.filename } } : item,
          ),
        )
      } catch {
        setUploads((current) => current.map((item) => (item.key === key ? { ...item, state: 'error' } : item)))
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSend) return
    const files = uploads.flatMap(({ file }) => (file ? [file] : []))
    setText('')
    setUploads([])
    await onSend(text.trim(), files)
  }

  return (
    <form
      ref={form}
      onSubmit={submit}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        attach(event.dataTransfer.files)
      }}
    >
      {assistant.context && (
        <Badge variant="secondary" className="mb-2 max-w-full">
          <FileTextIcon data-icon="inline-start" />
          <span className="truncate">{t('lookingAt', { title: assistant.context.title })}</span>
        </Badge>
      )}
      <InputGroup>
        {uploads.length > 0 && (
          <InputGroupAddon align="block-start">
            <AttachmentGroup>
              {uploads.map((item) => (
                <Attachment key={item.key} size="sm" state={item.state === 'done' ? 'done' : item.state}>
                  <AttachmentMedia>{item.state === 'uploading' ? <Spinner /> : <ImageIcon />}</AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{item.name}</AttachmentTitle>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`${t('removeAttachment')}: ${item.name}`}
                      onClick={() => {
                        // Remove the private upload too, unless it already belongs to a sent message.
                        if (item.id) api(`assistant-files/${item.id}`, { method: 'DELETE' }).catch(() => undefined)
                        setUploads((current) => current.filter(({ key }) => key !== item.key))
                      }}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </AttachmentGroup>
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          value={text}
          aria-label={t('messagePlaceholder')}
          placeholder={t('messagePlaceholder')}
          className="max-h-48 p-3"
          onChange={(event) => setText(event.target.value)}
          onPaste={(event) => {
            if (event.clipboardData.files.length) {
              event.preventDefault()
              attach(event.clipboardData.files)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              form.current?.requestSubmit()
            }
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="icon-sm" variant="outline" className="rounded-full" aria-label={t('attach')} onClick={() => input.current?.click()}>
            <PlusIcon />
          </InputGroupButton>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) attach(event.target.files)
              event.target.value = ''
            }}
          />
          {models.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<InputGroupButton size="sm" className="ml-auto" aria-label={t('model')} />}>
                <span className="max-w-32 truncate">{selected?.model}</span>
                <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={assistant.model} onValueChange={(value) => assistant.setModel(String(value))}>
                  {connections.map(([id, label]) => (
                    <DropdownMenuGroup key={id}>
                      <DropdownMenuLabel>{label}</DropdownMenuLabel>
                      {models
                        .filter((option) => option.connectionID === id)
                        .map((option) => (
                          <DropdownMenuRadioItem key={option.key} value={option.key} closeOnClick>
                            {option.model}
                          </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">{selected?.model}</span>
          )}
          {busy ? (
            <InputGroupButton size="icon-sm" variant="default" className="rounded-full" aria-label={t('stop')} onClick={onStop}>
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton type="submit" size="icon-sm" variant="default" className="rounded-full" disabled={!canSend} aria-label={t('send')}>
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

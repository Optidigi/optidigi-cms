'use client'

import { getToolName, isToolUIPart, type FileUIPart } from 'ai'
import {
  Archive,
  ArrowUp,
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  FileText,
  History,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Message, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Trace, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/trace'
import {
  threadHref,
  useAssistant,
  type AssistantContext,
  type AssistantController,
  type AssistantTenant,
  type ChatMessage,
  type Thread,
} from '@/assistant/use-assistant'
import type { ModelProvider, ResponseDetail } from '@/assistant/protocol'
import { assistantSettingsHref } from './navigation'

const responseLabels: Record<ResponseDetail, string> = {
  brief: 'Kort',
  standard: 'Standaard',
  detailed: 'Uitgebreid',
}
const effortLabels: Record<string, string> = {
  default: 'Automatisch',
  low: 'Laag',
  medium: 'Gemiddeld',
  high: 'Hoog',
}
const providerLabels: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  'openai-compatible': 'OpenAI-compatibel',
}
const toolLabels: Record<string, string> = {
  countDocuments: 'Documenten tellen',
  createDocuments: 'Documenten aanmaken',
  findDocuments: 'Documenten zoeken',
  findDistinct: 'Waarden opzoeken',
  getCollectionSchema: 'Collectie controleren',
  updateDocument: 'Document bijwerken',
  checkSitePage: 'Website controleren',
  saveHomepageDraft: 'Homepageconcept opslaan',
  requestDelete: 'Verwijdering aanvragen',
}

type State = {
  chat: AssistantController
  tenant: AssistantTenant
  document?: AssistantContext
  locale: 'nl' | 'en'
  includeContext: boolean
  setIncludeContext: (value: boolean) => void
}
const AssistantState = createContext<State | null>(null)

export function ShadcnAssistantProvider({
  tenant,
  document,
  locale,
  children,
}: {
  tenant: AssistantTenant
  document?: AssistantContext
  locale: 'nl' | 'en'
  children: ReactNode
}) {
  const [includeContext, setIncludeContext] = useState(true)
  const chat = useAssistant({ tenant, document: includeContext ? document : undefined, locale })
  return (
    <AssistantState.Provider
      value={{ chat, tenant, document, locale, includeContext, setIncludeContext }}
    >
      {children}
    </AssistantState.Provider>
  )
}

export function ShadcnAssistantLauncher({ route }: { route: string }) {
  const [open, setOpen] = useState(false)
  const state = useContext(AssistantState)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles data-icon="inline-start" /> Vraag AI
      </SheetTrigger>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="flex-row items-center justify-between border-b pe-14">
          <div>
            <SheetTitle>AI-assistent</SheetTitle>
            <SheetDescription className="sr-only">
              Assistent voor de actieve website
            </SheetDescription>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Open assistentpagina"
            nativeButton={false}
            render={
              <Link
                href={threadHref(route, state?.chat.thread?.id)}
                onClick={() => setOpen(false)}
              />
            }
          >
            <ExternalLink />
          </Button>
        </SheetHeader>
        <ShadcnAssistantBody />
      </SheetContent>
    </Sheet>
  )
}

export function ShadcnAssistantBody({ full = false }: { full?: boolean }) {
  const state = useContext(AssistantState)
  if (!state)
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>Assistent niet beschikbaar</EmptyTitle>
          <EmptyDescription>Je account heeft geen lidmaatschap voor deze website.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {full && (
        <aside
          aria-label="Gesprekken"
          className="hidden h-full w-64 shrink-0 border-e bg-sidebar/40 lg:flex"
        >
          <ThreadHistory chat={state.chat} />
        </aside>
      )}
      <Chat {...state} full={full} />
    </div>
  )
}

function ThreadHistory({ chat, onSelect }: { chat: AssistantController; onSelect?: () => void }) {
  const titleID = useId()
  const [rename, setRename] = useState<Thread>()
  const [remove, setRemove] = useState<Thread>()
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="space-y-2 border-b p-3">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={chat.newThread}
          disabled={chat.busy}
        >
          <Plus /> Nieuw gesprek
        </Button>
        <Input
          aria-label="Gesprekken zoeken"
          placeholder="Zoek gesprekken"
          maxLength={120}
          value={chat.historyQuery}
          onChange={(event) => chat.setHistoryQuery(event.target.value)}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={chat.archived ? 'ghost' : 'secondary'}
            aria-pressed={!chat.archived}
            onClick={() => chat.setArchived(false)}
          >
            Recent
          </Button>
          <Button
            size="sm"
            variant={chat.archived ? 'secondary' : 'ghost'}
            aria-pressed={chat.archived}
            onClick={() => chat.setArchived(true)}
          >
            Archief
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {chat.historyStatus === 'loading' && (
            <div className="grid gap-2 p-1" role="status" aria-label="Gesprekken laden">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          )}
          {chat.historyStatus === 'error' && (
            <div className="space-y-2 p-2 text-sm">
              <p>Gesprekken laden is mislukt.</p>
              <Button size="sm" variant="outline" onClick={chat.reloadHistory}>
                Opnieuw laden
              </Button>
            </div>
          )}
          {chat.historyStatus === 'ready' && !chat.history.length && (
            <p className="p-2 text-sm text-muted-foreground">
              {chat.historyQuery
                ? 'Geen gesprekken gevonden.'
                : 'Hier staan je opgeslagen gesprekken.'}
            </p>
          )}
          {chat.historyStatus === 'ready' &&
            chat.history.map((thread) => (
              <div key={thread.id} className="flex min-w-0 items-center gap-1">
                <Button
                  size="sm"
                  className="min-w-0 flex-1 justify-start"
                  disabled={chat.busy}
                  variant={chat.thread?.id === thread.id ? 'secondary' : 'ghost'}
                  aria-current={chat.thread?.id === thread.id ? 'true' : undefined}
                  onClick={() => {
                    chat.selectThread(thread.id)
                    onSelect?.()
                  }}
                >
                  <span className="truncate">{thread.title}</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={'Opties voor ' + thread.title}
                      />
                    }
                    disabled={chat.busy}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRename(thread)}>
                      <Pencil /> Naam wijzigen
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => chat.updateThread(thread.id, { archived: !thread.archived })}
                    >
                      <Archive /> {thread.archived ? 'Uit archief halen' : 'Archiveren'}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setRemove(thread)}>
                      <Trash2 /> Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          {chat.nextPage && chat.historyStatus === 'ready' && (
            <Button
              className="w-full"
              size="sm"
              variant="ghost"
              disabled={chat.loadingMore}
              onClick={chat.loadMore}
            >
              {chat.loadingMore ? 'Laden…' : 'Meer gesprekken'}
            </Button>
          )}
        </div>
      </ScrollArea>
      <Dialog
        open={Boolean(rename)}
        onOpenChange={(open) => {
          if (!open) setRename(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naam wijzigen</DialogTitle>
            <DialogDescription>Geef dit gesprek een herkenbare naam.</DialogDescription>
          </DialogHeader>
          {rename && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                const title = String(new FormData(event.currentTarget).get('title') ?? '').trim()
                if (title) chat.updateThread(rename.id, { title })
                setRename(undefined)
              }}
            >
              <Field>
                <FieldLabel htmlFor={titleID}>Naam van gesprek</FieldLabel>
                <Input
                  id={titleID}
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={rename.title}
                />
              </Field>
              <DialogFooter>
                <Button type="submit">Opslaan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesprek verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              De berichten en privébijlagen in dit gesprek worden verwijderd. Eerder opgeslagen
              wijzigingen in het CMS blijven beschikbaar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (remove) chat.updateThread(remove.id, 'delete')
              }}
            >
              Gesprek verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Chat({
  chat,
  tenant,
  document,
  locale,
  includeContext,
  setIncludeContext,
  full,
}: State & { full: boolean }) {
  const connected = chat.model?.connected === true
  const [historyOpen, setHistoryOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const upload = useRef<HTMLInputElement>(null)
  const allowedTypes = chat.model?.capabilities?.attachmentTypes ?? []
  const efforts = chat.model?.capabilities?.efforts ?? []
  const composerAvailable = connected && !chat.thread?.archived
  const statusText = chat.notice || (chat.modelStatus === 'loading' ? 'Modelverbinding laden…' : '')

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                variant="ghost"
                className={full ? 'lg:hidden' : undefined}
                aria-label="Gespreksgeschiedenis"
              />
            }
          >
            <History />
          </DialogTrigger>
          <DialogContent className="max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Gespreksgeschiedenis</DialogTitle>
              <DialogDescription>Kies een opgeslagen gesprek of begin opnieuw.</DialogDescription>
            </DialogHeader>
            <div className="flex h-[min(30rem,65dvh)] min-h-0 overflow-hidden rounded-lg border">
              <ThreadHistory chat={chat} onSelect={() => setHistoryOpen(false)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                Sluiten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Badge variant="secondary" className="max-w-40 truncate">
          {tenant.name}
        </Badge>
        {document && (
          <Button
            size="sm"
            type="button"
            variant="ghost"
            aria-pressed={includeContext}
            disabled={chat.busy}
            onClick={() => setIncludeContext(!includeContext)}
          >
            <FileText /> {includeContext ? 'Documentcontext actief' : 'Documentcontext uit'}
          </Button>
        )}
        <span className="ms-auto text-xs text-muted-foreground">
          {locale === 'en' ? 'EN' : 'NL'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className={full ? 'lg:hidden' : undefined}
          onClick={chat.newThread}
          disabled={chat.busy}
        >
          <Plus /> Nieuw gesprek
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport role="log" aria-label="Gesprek" aria-live="polite">
              <MessageScrollerContent className="mx-auto max-w-3xl gap-5 px-4 py-4">
                {chat.operation === 'thread' && !chat.messages.length && (
                  <Skeleton className="h-20 w-full" />
                )}
                {!chat.messages.length && chat.operation !== 'thread' && (
                  <Empty className="my-auto">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Sparkles />
                      </EmptyMedia>
                      <EmptyTitle>Waar kan ik mee helpen?</EmptyTitle>
                      <EmptyDescription>
                        Vraag iets over je website of maak samen een concept.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {chat.messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === 'user'}
                  >
                    <ChatTurn message={message} tenant={tenant.id} />
                  </MessageScrollerItem>
                ))}
                {chat.status === 'submitted' && (
                  <Trace>
                    <TraceLine status="running">
                      <TraceIcon>
                        <Spinner />
                      </TraceIcon>
                      <TraceTitle>Antwoord voorbereiden</TraceTitle>
                    </TraceLine>
                  </Trace>
                )}
                {chat.result &&
                  !chat.messages.at(-1)?.parts.some((part) => part.type === 'data-draft-saved') && (
                    <DraftLink tenant={tenant.id} result={chat.result} />
                  )}
                {chat.approval && (
                  <Item variant="outline" size="sm">
                    <ItemMedia variant="icon">
                      <Trash2 />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{chat.approval.label} verwijderen?</ItemTitle>
                      <ItemDescription>Dit verwijdert het document uit Payload.</ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={chat.busy}
                        onClick={chat.reject}
                      >
                        Annuleren
                      </Button>
                      {tenant.canManage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={chat.busy}
                          onClick={chat.approve}
                        >
                          Verwijderen
                        </Button>
                      )}
                    </ItemActions>
                  </Item>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
      <footer className="mx-auto w-full max-w-3xl space-y-2 px-4 pb-4 pt-2">
        {statusText && (
          <p role="status" className="text-sm text-muted-foreground">
            {statusText}
          </p>
        )}
        {chat.error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              <span>{chat.error}</span>
              {chat.thread && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-fit"
                  onClick={chat.reloadThread}
                  disabled={chat.busy}
                >
                  Gesprek opnieuw laden
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {chat.modelStatus === 'error' && (
          <p className="text-sm text-destructive">
            De modelverbinding kon niet worden geladen. Laad de pagina opnieuw.
          </p>
        )}
        {chat.model?.connected === false && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {tenant.canManage
                ? 'Verbind een model om te beginnen.'
                : 'Vraag je websitebeheerder om een model te verbinden.'}
            </span>
            {tenant.canManage && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={assistantSettingsHref(tenant.id)} />}
              >
                <Settings2 /> Model verbinden
              </Button>
            )}
          </div>
        )}
        {chat.thread?.archived && (
          <p className="text-sm text-muted-foreground">
            Haal dit gesprek uit het archief om verder te chatten.
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            chat.send()
          }}
        >
          <InputGroup className="rounded-xl">
            {chat.files.length > 0 && (
              <InputGroupAddon align="block-start" className="flex-wrap">
                {chat.files.map((file, index) => (
                  <AttachmentCard
                    key={file.url}
                    file={file}
                    disabled={chat.busy}
                    onRemove={() => chat.removeFile(index)}
                  />
                ))}
              </InputGroupAddon>
            )}
            <InputGroupTextarea
              aria-label="Bericht"
              value={chat.input}
              rows={2}
              maxLength={6000}
              disabled={!composerAvailable}
              placeholder="Hoe kan ik helpen?"
              onChange={(event) => chat.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <InputGroupAddon align="block-end" className="flex-wrap">
              <Input
                ref={upload}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                hidden
                aria-label="Bestanden"
                onChange={(event) => {
                  chat.upload(event.target.files)
                  event.target.value = ''
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<InputGroupButton size="icon-sm" aria-label="Bijlage toevoegen" />}
                  disabled={
                    !composerAvailable ||
                    !allowedTypes.length ||
                    chat.busy ||
                    chat.files.length >= 3
                  }
                >
                  {chat.operation === 'upload' ? <Spinner /> : <Paperclip />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => upload.current?.click()}>
                    <Paperclip /> Privébestand uploaden
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAssetsOpen(true)}>
                    <FileText /> Uit mediabibliotheek
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {chat.model?.model &&
                (tenant.canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<InputGroupButton size="sm" className="max-w-[12rem]" />}
                      disabled={chat.busy}
                    >
                      <span className="truncate">{chat.model.model}</span>
                      <ChevronDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Verbonden model</DropdownMenuLabel>
                        <DropdownMenuItem render={<Link href={assistantSettingsHref(tenant.id)} />}>
                          <Settings2 /> Modelverbinding beheren
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge className="max-w-40 truncate" variant="secondary">
                    {chat.model.model}
                  </Badge>
                ))}
              {connected && efforts.length > 0 && (
                <OptionMenu
                  label="Redeneerinspanning"
                  value={chat.effort}
                  options={['default', ...efforts].map((key) => [key, effortLabels[key] ?? key])}
                  onChange={chat.setEffort}
                  disabled={chat.busy}
                />
              )}
              {connected && (
                <OptionMenu
                  label="Antwoordlengte"
                  value={chat.detail}
                  options={Object.entries(responseLabels)}
                  onChange={(value) => chat.setDetail(value as ResponseDetail)}
                  disabled={chat.busy}
                />
              )}
              <InputGroupButton
                size="icon-sm"
                variant="default"
                className="ms-auto rounded-full"
                type={chat.streaming ? 'button' : 'submit'}
                aria-label={chat.streaming ? 'Stop' : 'Versturen'}
                disabled={
                  !chat.streaming &&
                  (!composerAvailable ||
                    (!chat.input.trim() && !chat.files.length) ||
                    Boolean(chat.approval) ||
                    chat.busy)
                }
                onClick={chat.streaming ? chat.stop : undefined}
              >
                {chat.streaming ? <Square /> : <ArrowUp />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </footer>
      <MediaPicker
        open={assetsOpen}
        onOpenChange={setAssetsOpen}
        tenant={tenant.id}
        allowedTypes={allowedTypes}
        onSelect={(file) => {
          chat.attachMedia(file)
          setAssetsOpen(false)
        }}
      />
    </div>
  )
}

function OptionMenu({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
  disabled: boolean
}) {
  const selected = options.find(([key]) => key === value)?.[1] ?? label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label + ': ' + selected}
        render={<InputGroupButton size="sm" />}
        disabled={disabled}
      >
        {selected}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map(([key, name]) => (
            <DropdownMenuRadioItem key={key} value={key} closeOnClick>
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AttachmentCard({
  file,
  onRemove,
  disabled,
}: {
  file: FileUIPart
  onRemove?: () => void
  disabled?: boolean
}) {
  const href =
    file.url.startsWith('/api/assistant-uploads/file/') || file.url.startsWith('/api/media/file/')
      ? file.url
      : undefined
  return (
    <Attachment size="sm" state="done" className="w-fit max-w-full">
      <AttachmentMedia>
        <FileText />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
              {file.filename || 'Bijlage'}
            </a>
          ) : (
            file.filename || 'Bijlage'
          )}
        </AttachmentTitle>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <AttachmentAction
            type="button"
            aria-label={'Verwijder ' + (file.filename || 'bijlage')}
            disabled={disabled}
            onClick={onRemove}
          >
            <X />
          </AttachmentAction>
        </AttachmentActions>
      )}
    </Attachment>
  )
}

function ChatTurn({ message, tenant }: { message: ChatMessage; tenant: number }) {
  const [copied, setCopied] = useState(false)
  const user = message.role === 'user'
  const text = message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n')
  const attachments = message.parts.filter((part): part is FileUIPart => part.type === 'file')
  const tools = message.parts.filter(isToolUIPart)
  return (
    <Message align={user ? 'end' : 'start'}>
      <MessageContent>
        {attachments.length > 0 && (
          <div className={'flex flex-wrap gap-2' + (user ? ' justify-end' : '')}>
            {attachments.map((file, index) => (
              <AttachmentCard key={file.url + index} file={file} />
            ))}
          </div>
        )}
        {tools.length > 0 && (
          <Trace>
            {tools.map((part) => {
              const failed = part.state === 'output-error' || part.state === 'output-denied'
              const complete = part.state === 'output-available' || failed
              return (
                <TraceLine
                  key={part.toolCallId}
                  status={failed ? 'error' : complete ? undefined : 'running'}
                >
                  <TraceIcon>{complete ? failed ? <X /> : <Check /> : <Spinner />}</TraceIcon>
                  <TraceTitle>{toolLabels[getToolName(part)] ?? 'CMS-actie'}</TraceTitle>
                </TraceLine>
              )
            })}
          </Trace>
        )}
        {text &&
          (user ? (
            <Bubble align="end" variant="muted">
              <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
            </Bubble>
          ) : (
            <div className="min-w-0 select-text [overflow-wrap:anywhere] text-sm leading-relaxed [&_a]:underline [&_li]:ms-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_pre]:overflow-auto [&_ul]:list-disc">
              <Markdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                {text}
              </Markdown>
            </div>
          ))}
        {message.parts.flatMap((part, index) =>
          part.type === 'data-draft-saved'
            ? [<DraftLink key={index} tenant={tenant} result={part.data} />]
            : [],
        )}
        {!user && text && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={copied ? 'Antwoord gekopieerd' : 'Antwoord kopiëren'}
            onClick={() =>
              void navigator.clipboard
                .writeText(text)
                .then(() => setCopied(true))
                .catch(() => {})
            }
          >
            {copied ? <Check /> : <Clipboard />}
          </Button>
        )}
      </MessageContent>
    </Message>
  )
}

function DraftLink({
  tenant,
  result,
}: {
  tenant: number
  result: { id: number; locale: 'nl' | 'en'; preview?: string | null }
}) {
  return (
    <Alert>
      <AlertTitle>Homepageconcept opgeslagen</AlertTitle>
      <AlertDescription className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                '/admin-shadcn/' + tenant + '/pages?id=' + result.id + '&locale=' + result.locale
              }
            />
          }
        >
          Open concept
        </Button>
        {result.preview && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href={result.preview} target="_blank" rel="noreferrer" />}
          >
            Open voorbeeld
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

type Asset = {
  id: number
  filename?: string | null
  alt: string
  url?: string | null
  mimeType?: string | null
}
function MediaPicker({
  open,
  onOpenChange,
  tenant,
  allowedTypes,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: number
  allowedTypes: string[]
  onSelect: (file: FileUIPart) => void
}) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ docs?: Asset[]; error?: boolean }>({})
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        depth: '0',
        limit: '15',
        'where[tenant][equals]': String(tenant),
      })
      if (query.trim()) params.set('where[filename][like]', query.trim())
      void fetch('/api/media?' + params, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('Asset request failed')
          const { docs } = (await response.json()) as { docs: Asset[] }
          if (!controller.signal.aborted) setResult({ docs })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ error: true })
        })
    }, 180)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, tenant, query])

  function select(asset: Asset) {
    if (!asset.url || !asset.mimeType || !allowedTypes.includes(asset.mimeType)) return
    const url = new URL(asset.url, window.location.origin)
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/media/file/'))
      return
    onSelect({
      type: 'file',
      mediaType: asset.mimeType,
      filename: asset.filename ?? asset.alt,
      url: url.pathname,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setResult({})
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uit mediabibliotheek</DialogTitle>
          <DialogDescription>Kies een bestand van deze website.</DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Media zoeken"
          placeholder="Zoek op bestandsnaam"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setResult({})
          }}
        />
        <ScrollArea className="h-64">
          {result.error && <p className="text-sm text-destructive">Media laden is mislukt.</p>}
          {!result.docs && !result.error && <Skeleton className="h-14 w-full" />}
          {result.docs
            ?.filter(({ mimeType }) => mimeType && allowedTypes.includes(mimeType))
            .map((asset) => (
              <Button
                size="sm"
                key={asset.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => select(asset)}
              >
                <FileText />
                <span className="truncate">{asset.filename || asset.alt}</span>
              </Button>
            ))}
          {result.docs &&
            !result.docs.some(({ mimeType }) => mimeType && allowedTypes.includes(mimeType)) && (
              <p className="text-sm text-muted-foreground">Geen ondersteunde bestanden gevonden.</p>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function ShadcnAssistantSettings() {
  const state = useContext(AssistantState)
  if (!state)
    return (
      <Alert>
        <AlertDescription>
          Je hebt geen toegang tot de assistent voor deze website.
        </AlertDescription>
      </Alert>
    )
  return <ConnectionSettings {...state} />
}

function ConnectionSettings({ chat, tenant }: State) {
  const [replacing, setReplacing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const connection = chat.model?.settings
  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Modelverbinding</CardTitle>
          <CardDescription>Deze verbinding geldt voor {tenant.name}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={chat.model?.connected ? 'default' : 'secondary'}>
              {chat.model?.connected
                ? 'Verbonden'
                : chat.model
                  ? 'Geen model verbonden'
                  : 'Verbinding laden…'}
            </Badge>
            {connection && (
              <span className="text-sm text-muted-foreground">
                {providerLabels[connection.provider]}
              </span>
            )}
            {chat.model?.model && <span className="text-sm font-medium">{chat.model.model}</span>}
          </div>
          {(chat.error || chat.notice || chat.modelStatus === 'error') && (
            <Alert
              variant={chat.error || chat.modelStatus === 'error' ? 'destructive' : 'default'}
              role={chat.error || chat.modelStatus === 'error' ? 'alert' : 'status'}
            >
              <AlertDescription>
                {chat.error || chat.notice || 'De modelverbinding kon niet worden geladen.'}
              </AlertDescription>
            </Alert>
          )}
          {!tenant.canManage && (
            <p className="text-sm text-muted-foreground">
              Websitebeheerders kunnen de modelverbinding wijzigen.
            </p>
          )}
          {tenant.canManage && chat.model?.connected && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setReplacing(!replacing)}>
                Verbinding wijzigen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDisconnecting(true)}
                disabled={chat.busy}
              >
                Loskoppelen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {tenant.canManage && chat.model && (!chat.model.connected || replacing) && (
        <ModelConnection
          key={connection?.provider + ':' + connection?.model}
          chat={chat}
          onSaved={() => setReplacing(false)}
        />
      )}
      <AlertDialog open={disconnecting} onOpenChange={setDisconnecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Model loskoppelen?</AlertDialogTitle>
            <AlertDialogDescription>
              De opgeslagen sleutel wordt verwijderd. Gesprekken blijven beschikbaar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => chat.disconnect()}>
              Loskoppelen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ModelConnection({ chat, onSaved }: { chat: AssistantController; onSaved: () => void }) {
  const formId = useId()
  const values = chat.model?.settings
  const [provider, setProvider] = useState<ModelProvider>(values?.provider ?? 'openai')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{chat.model?.connected ? 'Verbinding vervangen' : 'Model verbinden'}</CardTitle>
        <CardDescription>Gebruik de API-sleutel van deze website.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            chat.connect(new FormData(form), () => {
              form.reset()
              onSaved()
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={formId + '-provider'}>Provider</FieldLabel>
              <NativeSelect
                id={formId + '-provider'}
                name="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as ModelProvider)}
              >
                {Object.entries(providerLabels).map(([key, name]) => (
                  <NativeSelectOption key={key} value={key}>
                    {name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={formId + '-model'}>Model-ID</FieldLabel>
              <Input
                id={formId + '-model'}
                name="model"
                required
                maxLength={150}
                defaultValue={values?.model}
              />
            </Field>
            {provider === 'openai-compatible' && (
              <Field>
                <FieldLabel htmlFor={formId + '-url'}>Provider-URL</FieldLabel>
                <Input
                  id={formId + '-url'}
                  name="baseURL"
                  type="url"
                  required
                  defaultValue={values?.baseURL ?? ''}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={formId + '-key'}>API-sleutel</FieldLabel>
              <Input
                id={formId + '-key'}
                name="apiKey"
                type="password"
                required
                autoComplete="new-password"
              />
              <FieldDescription>Sleutels worden versleuteld opgeslagen.</FieldDescription>
            </Field>
            <Button className="w-fit" type="submit" disabled={chat.busy}>
              Verbinding opslaan
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

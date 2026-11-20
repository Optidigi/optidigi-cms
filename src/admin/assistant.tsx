'use client'

import { useAdminTranslations, useEditingGuard } from '@/admin/i18n-context'

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
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { useHydrated } from '@/hooks/use-hydrated'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Image from 'next/image'
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
  DropdownMenuItem,
  DropdownMenuGroup,
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
  InputGroupInput,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ChatOverview } from './chat-overview'

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
  const t = useAdminTranslations()

  const [open, setOpen] = useState(false)
  const state = useContext(AssistantState)
  const composer = useRef<HTMLTextAreaElement>(null)
  if (!state) return null
  const { chat, document } = state
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <InputGroup className="w-full sm:max-w-md">
        <InputGroupInput
          aria-label={t('Concept voor de assistent')}
          placeholder={t(
            document ? 'Vraag iets over dit document…' : 'Vraag iets aan de assistent…',
          )}
          value={chat.input}
          maxLength={6000}
          onChange={(event) => chat.setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              setOpen(true)
            }
          }}
        />
        <InputGroupAddon>
          <Sparkles aria-hidden />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <SheetTrigger render={<InputGroupButton size="icon-xs" aria-label={t('Vraag AI')} />}>
            <ArrowUp />
          </SheetTrigger>
        </InputGroupAddon>
      </InputGroup>
      <SheetContent
        initialFocus={() => (composer.current?.disabled ? undefined : composer.current)}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="flex-row items-center justify-between border-b pe-14">
          <div>
            <SheetTitle>{t('AI-assistent')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('Assistent voor de actieve website')}
            </SheetDescription>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('Open assistentpagina')}
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
        <ShadcnAssistantBody composer={composer} />
      </SheetContent>
    </Sheet>
  )
}

export function ShadcnAssistantBody({
  full = false,
  composer,
}: {
  full?: boolean
  composer?: React.Ref<HTMLTextAreaElement>
}) {
  const t = useAdminTranslations()

  const state = useContext(AssistantState)
  if (!state)
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>{t('Assistent niet beschikbaar')}</EmptyTitle>
          <EmptyDescription>
            {t('Je account heeft geen lidmaatschap voor deze website.')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {full && (
        <aside
          aria-label={t('Gesprekken')}
          className="hidden h-full w-64 shrink-0 border-e bg-muted/35 lg:flex"
        >
          <ThreadHistory chat={state.chat} />
        </aside>
      )}
      <Chat {...state} full={full} composer={composer} />
    </div>
  )
}

function ThreadHistory({ chat, onSelect }: { chat: AssistantController; onSelect?: () => void }) {
  const t = useAdminTranslations()

  const titleID = useId()
  const dates = new Intl.DateTimeFormat(t('nl-NL'), {
    dateStyle: 'medium',
    timeZone: 'Europe/Amsterdam',
  })
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
          <Plus />
          {t('Nieuw gesprek')}
        </Button>
        <Input
          aria-label={t('Gesprekken zoeken')}
          placeholder={t('Zoek gesprekken')}
          maxLength={120}
          value={chat.historyQuery}
          onChange={(event) => chat.setHistoryQuery(event.target.value)}
        />
        <div className="flex gap-1">
          <ToggleGroup
            value={[chat.archived ? 'archived' : 'recent']}
            size="sm"
            onValueChange={(values) => {
              if (values.length) chat.setArchived(values[0] === 'archived')
            }}
          >
            <ToggleGroupItem value="recent">Recent</ToggleGroupItem>
            <ToggleGroupItem value="archived">{t('Archief')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {chat.historyStatus === 'loading' && (
            <div className="grid gap-2 p-1" role="status" aria-label={t('Gesprekken laden')}>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          )}
          {chat.historyStatus === 'error' && (
            <div className="space-y-2 p-2 text-sm">
              <p>{t('Gesprekken laden is mislukt.')}</p>
              <Button size="sm" variant="outline" onClick={chat.reloadHistory}>
                {t('Opnieuw laden')}
              </Button>
            </div>
          )}
          {chat.historyStatus === 'ready' && !chat.history.length && (
            <p className="p-2 text-sm text-muted-foreground">
              {chat.historyQuery
                ? t('Geen gesprekken gevonden.')
                : t('Hier staan je opgeslagen gesprekken.')}
            </p>
          )}
          {chat.historyStatus === 'ready' &&
            chat.history.map((thread, index) => (
              <div key={thread.id}>
                {(index === 0 ||
                  dates.format(new Date(thread.updatedAt)) !==
                    dates.format(new Date(chat.history[index - 1].updatedAt))) && (
                  <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">
                    {dates.format(new Date(thread.updatedAt))}
                  </p>
                )}
                <div className="flex min-w-0 items-center gap-1">
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
                          aria-label={t('Opties voor ') + thread.title}
                        />
                      }
                      disabled={chat.busy}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setRename(thread)}>
                        <Pencil />
                        {t('Naam wijzigen')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => chat.updateThread(thread.id, { archived: !thread.archived })}
                      >
                        <Archive /> {thread.archived ? t('Uit archief halen') : t('Archiveren')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setRemove(thread)}>
                        <Trash2 />
                        {t('Verwijderen')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
              {chat.loadingMore ? t('Laden…') : t('Meer gesprekken')}
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
            <DialogTitle>{t('Naam wijzigen')}</DialogTitle>
            <DialogDescription>{t('Geef dit gesprek een herkenbare naam.')}</DialogDescription>
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
                <FieldLabel htmlFor={titleID}>{t('Naam van gesprek')}</FieldLabel>
                <Input
                  id={titleID}
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={rename.title}
                />
              </Field>
              <DialogFooter>
                <Button type="submit">{t('Opslaan')}</Button>
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
            <AlertDialogTitle>{t('Gesprek verwijderen?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'De berichten en privébijlagen in dit gesprek worden verwijderd. Eerder opgeslagen wijzigingen in het CMS blijven beschikbaar.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Annuleren')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (remove) chat.updateThread(remove.id, 'delete')
              }}
            >
              {t('Gesprek verwijderen')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Adapted from shadcn-ui/chatbot-template with the tenant-scoped assistant controller.
function Chat({
  chat,
  tenant,
  document,
  includeContext,
  setIncludeContext,
  full,
  composer,
}: State & { full: boolean; composer?: React.Ref<HTMLTextAreaElement> }) {
  const ready = useHydrated()
  const t = useAdminTranslations()

  const connected = chat.model?.connected === true
  const [historyOpen, setHistoryOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const upload = useRef<HTMLInputElement>(null)
  const allowedTypes = chat.capabilities?.attachmentTypes ?? []
  const efforts = chat.capabilities?.efforts ?? []
  const composerAvailable = connected && !chat.thread?.archived
  const emptyConversation =
    chat.messages.length === 0 && chat.operation !== 'thread' && !chat.streaming
  const contextLabel = t(includeContext ? 'Documentcontext actief' : 'Documentcontext uit')
  const statusText =
    t(chat.notice) || (chat.modelStatus === 'loading' ? t('Modelverbinding laden…') : '')

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 shrink-0 items-center gap-1 border-b px-3 py-2 sm:gap-2 sm:px-4">
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                variant="ghost"
                className={full ? 'lg:hidden' : undefined}
                aria-label={t('Gespreksgeschiedenis')}
                disabled={!ready}
              />
            }
          >
            <History />
          </DialogTrigger>
          <DialogContent className="max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{t('Gespreksgeschiedenis')}</DialogTitle>
              <DialogDescription>
                {t('Kies een opgeslagen gesprek of begin opnieuw.')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex h-[min(30rem,65dvh)] min-h-0 overflow-hidden rounded-lg border">
              <ThreadHistory chat={chat} onSelect={() => setHistoryOpen(false)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                {t('Sluiten')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <span className="min-w-0 truncate text-sm font-medium">
          {chat.thread?.title && chat.thread.title !== 'Nieuw gesprek'
            ? chat.thread.title
            : t('Gesprek')}
        </span>
        {document && (
          <Button
            size="sm"
            type="button"
            variant="ghost"
            aria-label={contextLabel}
            aria-pressed={includeContext}
            disabled={chat.busy}
            onClick={() => setIncludeContext(!includeContext)}
          >
            <FileText /> <span className="hidden sm:inline">{contextLabel}</span>
          </Button>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className={full ? 'lg:hidden' : undefined}
          aria-label={t('Nieuw gesprek')}
          onClick={chat.newThread}
          disabled={chat.busy}
        >
          <Plus />
          <span className="hidden sm:inline">{t('Nieuw gesprek')}</span>
        </Button>
      </div>
      {emptyConversation ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          <ChatOverview
            contextual={Boolean(document && includeContext)}
            enabled={composerAvailable && !chat.busy}
            onSelect={chat.setInput}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport role="log" aria-label={t('Gesprek')} aria-live="polite">
                <MessageScrollerContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
                  {chat.operation === 'thread' && !chat.messages.length && (
                    <Skeleton className="h-20 w-full" />
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
                        <TraceTitle>{t('Antwoord voorbereiden')}</TraceTitle>
                      </TraceLine>
                    </Trace>
                  )}
                  {chat.result &&
                    !chat.messages
                      .at(-1)
                      ?.parts.some((part) => part.type === 'data-draft-saved') && (
                      <DraftLink tenant={tenant.id} result={chat.result} />
                    )}
                  {chat.approval && (
                    <Item variant="outline" size="sm">
                      <ItemMedia variant="icon">
                        <Trash2 />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          {chat.approval.label}
                          {t('verwijderen?')}
                        </ItemTitle>
                        <ItemDescription>
                          {t('Dit verwijdert het document uit Payload.')}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={chat.busy}
                          onClick={chat.reject}
                        >
                          {t('Annuleren')}
                        </Button>
                        {tenant.canManage && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={chat.busy}
                            onClick={chat.approve}
                          >
                            {t('Verwijderen')}
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
      )}
      <footer className="mx-auto w-full max-w-2xl space-y-2 px-4 pb-4 pt-2 sm:px-6">
        {statusText && (
          <p role="status" className="text-sm text-muted-foreground">
            {statusText}
          </p>
        )}
        {chat.error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              <span>{t(chat.error)}</span>
              {chat.thread && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-fit"
                  onClick={chat.reloadThread}
                  disabled={chat.busy}
                >
                  {t('Gesprek opnieuw laden')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {chat.canRetry && (
          <Button size="sm" variant="outline" type="button" onClick={chat.retry}>
            {t('Opnieuw proberen zonder CMS-acties')}
          </Button>
        )}
        {chat.modelStatus === 'error' && (
          <p className="text-sm text-destructive">
            {t('De modelverbinding kon niet worden geladen. Laad de pagina opnieuw.')}
          </p>
        )}
        {chat.model?.connected === false && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {tenant.canManage
                ? t('Verbind een model om te beginnen.')
                : t('Vraag je websitebeheerder om een model te verbinden.')}
            </span>
            {tenant.canManage && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={assistantSettingsHref(tenant.id)} />}
              >
                <Settings2 />
                {t('Model verbinden')}
              </Button>
            )}
          </div>
        )}
        {chat.thread?.archived && (
          <p className="text-sm text-muted-foreground">
            {t('Haal dit gesprek uit het archief om verder te chatten.')}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            chat.send()
          }}
        >
          <InputGroup className="rounded-2xl bg-background shadow-sm">
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
              ref={composer}
              aria-label={t('Bericht')}
              value={chat.input}
              onPaste={(event) => {
                if (event.clipboardData.files.length) {
                  event.preventDefault()
                  chat.upload(event.clipboardData.files)
                }
              }}
              rows={2}
              maxLength={6000}
              disabled={!composerAvailable}
              placeholder={t('Hoe kan ik helpen?')}
              onChange={(event) => chat.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <InputGroupAddon align="block-end" className="min-w-0 flex-nowrap gap-1">
              <Input
                ref={upload}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                hidden
                aria-label={t('Bestanden')}
                onChange={(event) => {
                  chat.upload(event.target.files)
                  event.target.value = ''
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<InputGroupButton size="icon-xs" aria-label={t('Bijlage toevoegen')} />}
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
                    <Paperclip />
                    {t('Privébestand uploaden')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAssetsOpen(true)}>
                    <FileText />
                    {t('Uit mediabibliotheek')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {chat.model?.model && <ChatModelPicker chat={chat} />}
              {connected && <ChatOptions chat={chat} efforts={efforts} />}
              <InputGroupButton
                size="icon-xs"
                variant="default"
                className="ms-auto shrink-0 rounded-full"
                type={chat.streaming ? 'button' : 'submit'}
                aria-label={chat.streaming ? 'Stop' : t('Versturen')}
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

function ChatModelPicker({ chat }: { chat: AssistantController }) {
  const t = useAdminTranslations()
  const [open, setOpen] = useState(false)
  const label = chat.selectedModel?.label ?? chat.model?.model
  const models = chat.model?.models ?? []
  if (models.length < 2) {
    return (
      <span
        className="flex h-6 min-w-0 max-w-40 flex-1 items-center px-1.5 text-sm text-muted-foreground"
        title={label}
      >
        <span className="truncate">{label}</span>
      </span>
    )
  }
  const unavailable = (model: (typeof models)[number]) =>
    chat.files.some(({ mediaType }) => !model.capabilities.attachmentTypes.includes(mediaType))
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <InputGroupButton
            size="xs"
            className="min-w-0 max-w-40 flex-1 justify-start"
            disabled={chat.busy}
            aria-label={t('Model kiezen') + (label ? ' · ' + label : '')}
          />
        }
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="shrink-0" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Model kiezen')}</DialogTitle>
          <DialogDescription>{t('Kies een model voor je volgende bericht.')}</DialogDescription>
        </DialogHeader>
        <Combobox
          items={models}
          value={chat.selectedModel ?? null}
          itemToStringLabel={(model) => model.label}
          isItemEqualToValue={(a, b) => a.id === b.id}
          onValueChange={(model) => {
            if (model && !unavailable(model)) {
              chat.selectModel(model.id)
              setOpen(false)
            }
          }}
        >
          <ComboboxInput aria-label={t('Zoek modellen')} placeholder={t('Zoek modellen')} />
          <ComboboxContent>
            <ComboboxEmpty>{t('Geen resultaten')}</ComboboxEmpty>
            <ComboboxList>
              {(model: (typeof models)[number]) => (
                <ComboboxItem key={model.id} value={model} disabled={unavailable(model)}>
                  <span className="min-w-0 flex-1 break-all">{model.label}</span>
                  {model.id === chat.model?.defaultModelID && (
                    <Badge variant="outline">{t('Standaard')}</Badge>
                  )}
                  {unavailable(model) && (
                    <span className="text-xs text-muted-foreground">
                      {t('Ondersteunt deze bijlage niet')}
                    </span>
                  )}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </DialogContent>
    </Dialog>
  )
}

function ChatOptions({ chat, efforts }: { chat: AssistantController; efforts: string[] }) {
  const t = useAdminTranslations()
  const detail = t(responseLabels[chat.detail])
  const effort = t(effortLabels[chat.effort] ?? chat.effort)
  const label = [
    t('Antwoordopties'),
    t('Antwoordlengte') + ': ' + detail,
    ...(efforts.length ? [t('Redeneerinspanning') + ': ' + effort] : []),
  ].join(' · ')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={chat.busy}
        render={
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label={label}
            title={t('Antwoordopties')}
          />
        }
      >
        <SlidersHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('Antwoordlengte')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={chat.detail}
            onValueChange={(value) => chat.setDetail(value as ResponseDetail)}
          >
            {Object.entries(responseLabels).map(([id, text]) => (
              <DropdownMenuRadioItem key={id} value={id} closeOnClick>
                {t(text)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {efforts.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('Redeneerinspanning')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={chat.effort} onValueChange={chat.setEffort}>
              {['default', ...efforts].map((id) => (
                <DropdownMenuRadioItem key={id} value={id} closeOnClick>
                  {t(effortLabels[id] ?? id)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        )}
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
  const t = useAdminTranslations()

  const href =
    file.url.startsWith('/api/assistant-uploads/file/') || file.url.startsWith('/api/media/file/')
      ? file.url
      : undefined
  return (
    <Attachment size="sm" state="done" className="w-fit max-w-full">
      <AttachmentMedia>
        {href && file.mediaType.startsWith('image/') ? (
          <Image
            alt=""
            src={href}
            unoptimized
            width={32}
            height={32}
            className="size-8 rounded object-cover"
          />
        ) : (
          <FileText />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
              {file.filename || t('Bijlage')}
            </a>
          ) : (
            file.filename || t('Bijlage')
          )}
        </AttachmentTitle>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <AttachmentAction
            type="button"
            aria-label={t('Verwijder ') + (file.filename || t('bijlage'))}
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
  const t = useAdminTranslations()

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
                  <TraceTitle>{t(toolLabels[getToolName(part)] ?? 'CMS-actie')}</TraceTitle>
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
        {!user && message.metadata?.model && (
          <span className="text-xs text-muted-foreground">{message.metadata.model}</span>
        )}
        {!user && text && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={copied ? t('Antwoord gekopieerd') : t('Antwoord kopiëren')}
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
  const t = useAdminTranslations()

  return (
    <Alert>
      <AlertTitle>{t('Homepageconcept opgeslagen')}</AlertTitle>
      <AlertDescription className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={'/admin/' + tenant + '/pages?id=' + result.id + '&locale=' + result.locale}
            />
          }
        >
          {t('Open concept')}
        </Button>
        {result.preview && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href={result.preview} target="_blank" rel="noreferrer" />}
          >
            {t('Open voorbeeld')}
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
  const t = useAdminTranslations()

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
          <DialogTitle>{t('Uit mediabibliotheek')}</DialogTitle>
          <DialogDescription>{t('Kies een bestand van deze website.')}</DialogDescription>
        </DialogHeader>
        <Input
          aria-label={t('Media zoeken')}
          placeholder={t('Zoek op bestandsnaam')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setResult({})
          }}
        />
        <ScrollArea className="h-64">
          {result.error && (
            <p className="text-sm text-destructive">{t('Media laden is mislukt.')}</p>
          )}
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
              <p className="text-sm text-muted-foreground">
                {t('Geen ondersteunde bestanden gevonden.')}
              </p>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function ShadcnAssistantSettings() {
  const t = useAdminTranslations()
  const state = useContext(AssistantState)
  const requested = useSearchParams().get('panel')
  if (!state)
    return (
      <Alert>
        <AlertDescription>
          {t('Je hebt geen toegang tot de assistent voor deze website.')}
        </AlertDescription>
      </Alert>
    )
  const { chat, tenant } = state
  const panel =
    requested === 'models' || (requested === 'defaults' && tenant.canManage)
      ? requested
      : 'connection'

  return (
    <Tabs
      className="min-w-0"
      value={panel}
      onValueChange={(value) => {
        const url = new URL(window.location.href)
        if (value === 'connection') url.searchParams.delete('panel')
        else url.searchParams.set('panel', String(value))
        window.history.pushState(null, '', url)
      }}
    >
      <div className="min-w-0 max-w-full overflow-x-auto pb-1">
        <TabsList variant="line" aria-label={t('AI-assistent')}>
          <TabsTrigger value="connection">{t('Verbinding')}</TabsTrigger>
          <TabsTrigger value="models">{t('Modellen')}</TabsTrigger>
          {tenant.canManage && <TabsTrigger value="defaults">{t('Standaardwaarden')}</TabsTrigger>}
        </TabsList>
      </div>
      {panel !== 'connection' && (chat.error || chat.notice) && (
        <Alert
          role={chat.error ? 'alert' : 'status'}
          variant={chat.error ? 'destructive' : 'default'}
          className="mt-2 max-w-2xl"
        >
          <AlertDescription>{t(chat.error || chat.notice)}</AlertDescription>
        </Alert>
      )}
      {chat.modelStatus === 'loading' ? (
        <div aria-busy="true" className="grid max-w-2xl gap-3 pt-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : chat.modelStatus === 'error' ? (
        <Alert role="alert" variant="destructive" className="mt-3 max-w-2xl">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {t('De modelverbinding kon niet worden geladen.')}
            <Button onClick={chat.reloadModel} size="sm" variant="outline">
              {t('Opnieuw laden')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <TabsContent value="connection" className="pt-3">
            <ConnectionSettings {...state} />
          </TabsContent>
          <TabsContent
            keepMounted
            inert={panel !== 'models'}
            aria-hidden={panel !== 'models'}
            value="models"
            className="pt-3"
          >
            <CatalogSettings {...state} panel="models" />
          </TabsContent>
          {tenant.canManage && (
            <TabsContent
              keepMounted
              inert={panel !== 'defaults'}
              aria-hidden={panel !== 'defaults'}
              value="defaults"
              className="pt-3"
            >
              <CatalogSettings {...state} panel="defaults" />
            </TabsContent>
          )}
        </>
      )}
    </Tabs>
  )
}

function CatalogSettings({ chat, tenant, panel }: State & { panel: 'models' | 'defaults' }) {
  const t = useAdminTranslations()
  const { markDirty } = useEditingGuard()
  const scope = 'assistant-' + panel
  useEffect(() => () => markDirty(false, scope), [markDirty, scope])
  const connection = chat.model?.settings
  const options = connection?.catalog

  if (!chat.model?.connected)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('Geen model verbonden')}</EmptyTitle>
          <EmptyDescription>{t('Verbind een model om te beginnen.')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  if (!tenant.canManage || !connection)
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Modellen')}</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chat.model.models?.map(({ id, label }) => (
              <TableRow key={id}>
                <TableCell className="whitespace-normal break-all">{label}</TableCell>
                <TableCell>
                  {id === chat.model?.defaultModelID && <Badge>{t('Standaard')}</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(panel === 'models' ? 'Modellen' : 'Assistentvoorkeuren')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          key={JSON.stringify(
            panel === 'models' ? options?.models : [options?.defaultModel, options?.detail],
          )}
          onChange={() => markDirty(true, scope)}
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const labels = form.getAll('modelLabel')
            const models =
              panel === 'models'
                ? form.getAll('modelID').map((model, index) => ({
                    model: String(model).trim(),
                    label: String(labels[index] ?? '').trim() || undefined,
                  }))
                : (options?.models ?? [])
            const preferred =
              panel === 'defaults'
                ? String(form.get('defaultModel') ?? '') || options?.defaultModel
                : options?.defaultModel
            chat.configureModels(
              {
                models,
                defaultModel: models.some(({ model }) => model === preferred)
                  ? preferred
                  : connection.model,
                detail:
                  panel === 'defaults' ? (form.get('detail') as ResponseDetail) : options?.detail,
              },
              () => markDirty(false, scope),
            )
          }}
        >
          {panel === 'models' ? (
            <CatalogRows
              key={JSON.stringify(options?.models)}
              baseModel={connection.model}
              preferred={options?.defaultModel ?? connection.model}
              models={options?.models ?? []}
            />
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="assistant-default-model">{t('Standaardmodel')}</FieldLabel>
                <Select
                  name="defaultModel"
                  defaultValue={options?.defaultModel ?? connection.model}
                  items={[
                    { value: connection.model, label: connection.model },
                    ...(options?.models ?? []).map(({ model, label }) => ({
                      value: model,
                      label: label ?? model,
                    })),
                  ]}
                >
                  <SelectTrigger id="assistant-default-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      <SelectItem value={connection.model}>{connection.model}</SelectItem>
                      {options?.models.map(({ model, label }) => (
                        <SelectItem key={model} value={model}>
                          {label ?? model}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="assistant-default-detail">{t('Antwoordlengte')}</FieldLabel>
                <RadioGroup
                  name="detail"
                  id="assistant-default-detail"
                  defaultValue={options?.detail ?? 'standard'}
                  aria-label={t('Antwoordlengte')}
                  className="flex flex-wrap gap-2"
                >
                  {Object.entries(responseLabels).map(([value, label]) => (
                    <FieldLabel
                      key={value}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 has-data-checked:border-primary"
                    >
                      <RadioGroupItem value={value} />
                      {t(label)}
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </Field>
            </>
          )}
          <Button type="submit" disabled={chat.busy}>
            {t('Wijzigingen opslaan')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CatalogRows({
  baseModel,
  models,
  preferred,
}: {
  baseModel: string
  models: { model: string; label?: string }[]
  preferred: string
}) {
  const t = useAdminTranslations()
  const { markDirty } = useEditingGuard()
  const [entries, setEntries] = useState(() => models.map((entry, id) => ({ ...entry, id })))
  const [editing, setEditing] = useState<{ id: number; model: string; label?: string }>()
  const [error, setError] = useState('')
  const nextID = useRef(entries.length)
  const field = useId()
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Modellen')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">{t('Acties')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="whitespace-normal [overflow-wrap:anywhere] font-medium">
                {baseModel}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {t(baseModel === preferred ? 'Standaard' : 'Verbindingsmodel')}
                </Badge>
              </TableCell>
              <TableCell />
            </TableRow>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-normal [overflow-wrap:anywhere]">
                  <span className="block font-medium">{entry.label || entry.model}</span>
                  {entry.label && (
                    <span className="block text-xs text-muted-foreground">{entry.model}</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.model === preferred && <Badge variant="secondary">{t('Standaard')}</Badge>}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('Acties') + ' · ' + (entry.label || entry.model)}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setError('')
                          setEditing(entry)
                        }}
                      >
                        <Pencil />
                        {t('Model bewerken')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          markDirty(true, 'assistant-models')
                          setEntries((current) => current.filter(({ id }) => id !== entry.id))
                        }}
                      >
                        <Trash2 />
                        {t('Model verwijderen')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {entries.map(({ id, model, label }) => (
        <div key={id} hidden>
          <input type="hidden" name="modelID" value={model} />
          <input type="hidden" name="modelLabel" value={label ?? ''} />
        </div>
      ))}
      <Sheet
        open={Boolean(editing)}
        onOpenChange={(value) => {
          if (!value) setEditing(undefined)
        }}
      >
        <SheetTrigger
          render={<Button type="button" variant="outline" disabled={entries.length >= 15} />}
          onClick={() => {
            setError('')
            setEditing({ id: nextID.current, model: '' })
          }}
        >
          <Plus />
          {t('Model toevoegen')}
        </SheetTrigger>
        <SheetContent className="w-full overflow-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t(editing?.model ? 'Model bewerken' : 'Model toevoegen')}</SheetTitle>
            <SheetDescription>
              {t('Voeg een model aan de huidige verbinding toe.')}
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <form
              key={editing.id}
              className="space-y-4 px-6 pb-6"
              onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const form = new FormData(event.currentTarget)
                const model = String(form.get('model') ?? '').trim()
                if (
                  !model ||
                  model === baseModel ||
                  entries.some((entry) => entry.id !== editing.id && entry.model === model)
                ) {
                  setError('Gebruik een uniek model-ID.')
                  return
                }
                const label = String(form.get('label') ?? '').trim() || undefined
                markDirty(true, 'assistant-models')
                const next = { ...editing, model, label }
                setEntries((current) =>
                  current.some(({ id }) => id === editing.id)
                    ? current.map((entry) => (entry.id === editing.id ? next : entry))
                    : [...current, next],
                )
                if (editing.id === nextID.current) nextID.current++
                setEditing(undefined)
              }}
            >
              <Field>
                <FieldLabel htmlFor={field + '-model'}>{t('Model-ID')}</FieldLabel>
                <Input
                  id={field + '-model'}
                  name="model"
                  defaultValue={editing.model}
                  required
                  maxLength={150}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={field + '-label'}>{t('Weergavenaam')}</FieldLabel>
                <Input
                  id={field + '-label'}
                  name="label"
                  defaultValue={editing.label}
                  maxLength={150}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {t(error)}
                </p>
              )}
              <Button type="submit">{t('Toepassen')}</Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function ConnectionSettings({ chat, tenant }: State) {
  const t = useAdminTranslations()

  const [replacing, setReplacing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const connection = chat.model?.settings
  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t('Verbindingsstatus')}
          </CardTitle>
          <CardDescription>
            {t('Deze verbinding geldt voor')} {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={chat.model?.connected ? 'default' : 'secondary'}>
              {chat.model?.connected
                ? t('Verbonden')
                : chat.model
                  ? t('Geen model verbonden')
                  : t('Verbinding laden…')}
            </Badge>
            {connection && (
              <span className="text-sm text-muted-foreground">
                {t(providerLabels[connection.provider])}
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
                {t(chat.error || chat.notice || 'De modelverbinding kon niet worden geladen.')}
              </AlertDescription>
            </Alert>
          )}
          {!tenant.canManage && (
            <p className="text-sm text-muted-foreground">
              {t('Websitebeheerders kunnen de modelverbinding wijzigen.')}
            </p>
          )}
          {tenant.canManage && chat.model?.connected && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setReplacing(!replacing)}>
                {t('Verbinding wijzigen')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={chat.testConnection}
                disabled={chat.busy}
              >
                {t('Verbinding testen')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDisconnecting(true)}
                disabled={chat.busy}
              >
                {t('Loskoppelen')}
              </Button>
            </div>
          )}
          {tenant.canManage && chat.model && (!chat.model.connected || replacing) && (
            <ModelConnection
              key={connection?.provider + ':' + connection?.model}
              chat={chat}
              onSaved={() => setReplacing(false)}
            />
          )}
        </CardContent>
      </Card>
      <AlertDialog open={disconnecting} onOpenChange={setDisconnecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Model loskoppelen?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('De opgeslagen sleutel wordt verwijderd. Gesprekken blijven beschikbaar.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Annuleren')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => chat.disconnect()}>
              {t('Loskoppelen')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ModelConnection({ chat, onSaved }: { chat: AssistantController; onSaved: () => void }) {
  const t = useAdminTranslations()

  const formId = useId()
  const values = chat.model?.settings
  const [provider, setProvider] = useState<ModelProvider>(values?.provider ?? 'openai')
  return (
    <div className="space-y-4 border-t pt-4">
      <FieldDescription>{t('Gebruik de API-sleutel van deze website.')}</FieldDescription>
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
            <FieldLabel htmlFor={formId + '-model'}>{t('Model-ID')}</FieldLabel>
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
              <FieldLabel htmlFor={formId + '-url'}>{t('Provider-URL')}</FieldLabel>
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
            <FieldLabel htmlFor={formId + '-key'}>{t('API-sleutel')}</FieldLabel>
            <Input
              id={formId + '-key'}
              name="apiKey"
              type="password"
              required
              autoComplete="new-password"
            />
            <FieldDescription>{t('Sleutels worden versleuteld opgeslagen.')}</FieldDescription>
          </Field>
          <Button className="w-fit" type="submit" disabled={chat.busy}>
            {t('Verbinding opslaan')}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}

'use client'

import { ArrowUpIcon, FileTextIcon, HistoryIcon, Maximize2Icon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useI18n } from '../client/i18n-provider'
import { useAssistant } from './assistant-context'
import { ChatHistory } from './chat-history'
import { ModelMenu } from './model-menu'
import { Conversation } from './conversation'

function onAssistantPage(pathname: string) {
  return /^\/admin\/\d+\/ai(\/|$)/.test(pathname)
}

// The overview has its own large prompt instead of the floating bar.
function onOverview(pathname: string) {
  return /^\/admin\/\d+\/?$/.test(pathname)
}

function onAISettings(pathname: string) {
  return /^\/admin\/\d+\/settings\/ai(\/|$)/.test(pathname)
}

// Below lg the editor has its own sticky save bar with an AI button instead; beside the live
// preview it has one at every size.
function barVisibility(bottomBar: false | 'small' | 'always') {
  return bottomBar === 'always' ? 'hidden' : bottomBar === 'small' ? 'hidden lg:flex' : 'flex'
}

// Lays the assistant panel next to the page so it pushes content aside instead of covering it.
// On small screens it opens as a bottom drawer.
export function AssistantFrame({ platformAdmin, children }: { platformAdmin: boolean; children: React.ReactNode }) {
  const assistant = useAssistant()
  const pathname = usePathname()
  const mobile = useIsMobile()
  const { t } = useI18n()
  const setOpen = assistant?.setOpen
  const ready = assistant?.setup.state === 'ready'
  const visible = Boolean(assistant?.open) && !onAssistantPage(pathname)

  useEffect(() => {
    // Until AI is set up for the website there is nothing to open.
    if (!setOpen || !ready) return
    const toggle = (event: KeyboardEvent) => {
      // Leave ⌘I to text fields and the rich-text editor, where it means italic.
      const target = event.target as HTMLElement | null
      if (event.defaultPrevented || target?.isContentEditable || target?.closest('textarea')) return
      if (event.key.toLowerCase() === 'i' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current: boolean) => !current)
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [setOpen, ready])

  if (!assistant) return children
  return (
    <div className="flex min-h-[calc(100svh-var(--inset-gap)*2)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        {!visible && !onAssistantPage(pathname) && !onOverview(pathname) && assistant.setup.state === 'ready' && <AskBar />}
        {platformAdmin &&
          assistant.setup.state === 'missing' &&
          !onAssistantPage(pathname) &&
          !onOverview(pathname) &&
          !onAISettings(pathname) && <SetupBar />}
      </div>
      {!mobile && visible && (
        <aside aria-label={t('assistantTitle')} className="sticky top-(--inset-gap) flex h-[calc(100svh-var(--inset-gap)*2)] w-[24rem] shrink-0 flex-col rounded-r-xl border-l bg-background">
          <PanelHeader />
          <Conversation compact />
        </aside>
      )}
      {mobile && (
        <Drawer open={visible} onOpenChange={assistant.setOpen}>
          <DrawerContent className="h-[85svh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{t('assistantTitle')}</DrawerTitle>
              <DrawerDescription>{t('assistantDescription')}</DrawerDescription>
            </DrawerHeader>
            <PanelHeader />
            <Conversation compact />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}

function PanelHeader() {
  const assistant = useAssistant()!
  const { t } = useI18n()
  const [history, setHistory] = useState(false)
  return (
    <div className="flex items-center gap-1 border-b px-3 py-2">
      <SparklesIcon className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate text-sm font-medium">{t('assistantTitle')}</span>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('history')} onClick={() => setHistory(true)} />}>
          <HistoryIcon />
        </TooltipTrigger>
        <TooltipContent>{t('history')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('newChat')} onClick={assistant.newChat} />}>
          <PlusIcon />
        </TooltipTrigger>
        <TooltipContent>{t('newChat')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={`/admin/${assistant.site}/ai`}
              aria-label={t('openFullPage')}
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              onClick={() => assistant.setOpen(false)}
            />
          }
        >
          <Maximize2Icon />
        </TooltipTrigger>
        <TooltipContent>{t('openFullPage')}</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="icon-sm" aria-label={t('close')} onClick={() => assistant.setOpen(false)}>
        <XIcon />
      </Button>
      <Sheet open={history} onOpenChange={setHistory}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t('history')}</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <ChatHistory onSelect={() => setHistory(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// The floating "Ask AI…" bar at the bottom of the page. Sending opens the panel (or the drawer on
// small screens) with the question as a new chat; while the panel is open the bar steps aside.
function AskBar() {
  const assistant = useAssistant()!
  const { t } = useI18n()
  const [text, setText] = useState('')

  // A typed question starts a new chat; sending an empty bar just reopens the last one.
  function send(event: React.FormEvent) {
    event.preventDefault()
    const question = text.trim()
    assistant.setOpen(true)
    if (!question) return
    assistant.startChat(question)
    setText('')
  }

  return (
    <div
      className={cn(
        'pointer-events-none sticky bottom-0 z-20 justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]',
        barVisibility(assistant.bottomBar),
      )}
    >
      <form onSubmit={send} className="pointer-events-auto w-full max-w-xl">
        <InputGroup className="h-11 rounded-full bg-background shadow-lg">
          <InputGroupAddon className="pl-3">
            <SparklesIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t('askAI')}
            placeholder={t('askAI')}
            value={text}
            enterKeyHint="send"
            onChange={(event) => setText(event.target.value)}
          />
          <InputGroupAddon align="inline-end" className="gap-2 pr-1.5">
            {assistant.context && (
              <Badge variant="secondary" className="hidden max-w-40 sm:inline-flex">
                <FileTextIcon data-icon="inline-start" />
                <span className="truncate">{assistant.context.title}</span>
              </Badge>
            )}
            <ModelMenu />
            {!text && (
              <KbdGroup className="hidden md:inline-flex">
                <Kbd>⌘</Kbd>
                <Kbd>I</Kbd>
              </KbdGroup>
            )}
            <InputGroupButton type="submit" size="icon-sm" variant="default" className="rounded-full" aria-label={t('send')}>
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  )
}

// In place of the bar for platform administrators while the website has no AI model yet: says so
// and links to the AI settings. Members can't change this, so they see nothing.
function SetupBar() {
  const assistant = useAssistant()!
  const { t } = useI18n()
  return (
    <div className={cn('pointer-events-none sticky bottom-0 z-20 justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]', barVisibility(assistant.bottomBar))}>
      <div className="pointer-events-auto flex h-11 w-full max-w-xl items-center gap-2 rounded-full border bg-background pr-1.5 pl-3 text-sm text-muted-foreground shadow-lg">
        <SparklesIcon className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{t('aiNotSetUpYet')}</span>
        <Link href={`/admin/${assistant.site}/settings/ai`} className={cn(buttonVariants({ size: 'sm' }), 'rounded-full')}>
          {t('setUpAI')}
        </Link>
      </div>
    </div>
  )
}

// An AI button for pages with their own sticky bottom bar (the editor on small screens).
export function AskButton() {
  const assistant = useAssistant()
  const { t } = useI18n()
  if (assistant?.setup.state !== 'ready') return null
  return (
    <Button variant="outline" size="icon" aria-label={t('askAI')} onClick={() => assistant.setOpen(true)}>
      <SparklesIcon />
    </Button>
  )
}

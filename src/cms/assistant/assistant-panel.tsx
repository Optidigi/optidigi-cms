'use client'

import { BotIcon, HistoryIcon, Maximize2Icon, PlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { useI18n } from '../client/i18n-provider'
import { useAssistant } from './assistant-context'
import { ChatHistory } from './chat-history'
import { Conversation } from './conversation'

function onAssistantPage(pathname: string) {
  return /^\/admin\/\d+\/assistant(\/|$)/.test(pathname)
}

// Lays the assistant panel next to the page so it pushes content aside instead of covering it.
// On small screens it opens as a bottom drawer.
export function AssistantFrame({ children }: { children: React.ReactNode }) {
  const assistant = useAssistant()
  const pathname = usePathname()
  const mobile = useIsMobile()
  const { t } = useI18n()
  const setOpen = assistant?.setOpen
  const visible = Boolean(assistant?.open) && !onAssistantPage(pathname)

  useEffect(() => {
    if (!setOpen) return
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'i' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current: boolean) => !current)
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [setOpen])

  if (!assistant) return children
  return (
    <div className="flex min-h-svh w-full">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {!mobile && visible && (
        <aside aria-label={t('assistantTitle')} className="sticky top-0 flex h-svh w-[24rem] shrink-0 flex-col border-l bg-background">
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
      <BotIcon className="size-4 text-muted-foreground" />
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
              href={`/admin/${assistant.site}/assistant`}
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

// The "Ask AI… ⌘I" field in the header. Enter opens the panel and sends the question.
export function AskField() {
  const assistant = useAssistant()
  const pathname = usePathname()
  const { t } = useI18n()
  const [text, setText] = useState('')
  if (!assistant || onAssistantPage(pathname)) return null
  return (
    <>
      <InputGroup className="hidden w-64 md:flex">
        <InputGroupAddon>
          <BotIcon />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={t('askAI')}
          placeholder={t('askAI')}
          value={text}
          onFocus={() => assistant.setup.state !== 'ready' && assistant.setOpen(true)}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && text.trim() && assistant.setup.state === 'ready') {
              event.preventDefault()
              assistant.setOpen(true)
              assistant.chat.sendMessage({ text: text.trim() })
              setText('')
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>I</Kbd>
          </KbdGroup>
        </InputGroupAddon>
      </InputGroup>
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t('askAI')} onClick={() => assistant.setOpen(true)}>
        <BotIcon />
      </Button>
    </>
  )
}

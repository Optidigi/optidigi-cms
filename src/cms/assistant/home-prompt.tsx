'use client'

import { ArrowUpIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MessageKey } from '../i18n'
import { useI18n } from '../client/i18n-provider'
import { useAssistant } from './assistant-context'
import { ModelMenu } from './model-menu'

const suggestions: MessageKey[] = ['suggestionNewPage', 'suggestionDrafts', 'suggestionSEO']

// The overview's large prompt: shadcn's Prompt Input with Suggestion buttons below it. It does what
// the floating bar does on other pages: sending opens the AI panel (the drawer on small screens)
// with the question, so the floating bar isn't shown on the overview.
export function HomePrompt({ platformAdmin }: { platformAdmin: boolean }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const [text, setText] = useState('')
  if (!assistant || assistant.setup.state === 'loading') return <Skeleton className="h-32 w-full rounded-xl" />
  if (assistant.setup.state === 'missing') {
    // Members can't set AI up, so they see nothing here.
    if (!platformAdmin) return null
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparklesIcon />
          </EmptyMedia>
          <EmptyTitle>{t('aiNotSetUpYet')}</EmptyTitle>
          <EmptyDescription>{t('noConnectionsAdmin')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={`/admin/${assistant.site}/settings/ai`} className={buttonVariants()}>
            {t('setUpAI')}
          </Link>
        </EmptyContent>
      </Empty>
    )
  }
  const idle = assistant.chat.status === 'ready' || assistant.chat.status === 'error'

  function send(question: string) {
    const trimmed = question.trim()
    assistant!.setOpen(true)
    if (!trimmed || !idle) return
    assistant!.chat.sendMessage({ text: trimmed })
    setText('')
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          send(text)
        }}
      >
        <InputGroup className="rounded-xl bg-background shadow-sm">
          <InputGroupTextarea
            aria-label={t('askAI')}
            placeholder={t('homePromptPlaceholder')}
            className="min-h-20 p-3 text-base md:text-base"
            value={text}
            enterKeyHint="send"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter starts a new line.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send(text)
              }
            }}
          />
          <InputGroupAddon align="block-end">
            <SparklesIcon className="text-muted-foreground" />
            <ModelMenu className="ml-auto" />
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              className={cn('rounded-full', assistant.setup.models.length < 2 && 'ml-auto')}
              aria-label={t('send')}
              disabled={!text.trim() || !idle}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
      <div className="flex scroll-fade-x gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        {suggestions.map((key) => (
          <Button key={key} type="button" variant="outline" size="sm" className="shrink-0" disabled={!idle} onClick={() => send(t(key))}>
            {t(key)}
          </Button>
        ))}
      </div>
    </div>
  )
}

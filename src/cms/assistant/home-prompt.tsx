'use client'

import { ArrowUpIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import type { MessageKey } from '../i18n'
import { useI18n } from '../client/i18n-provider'
import { useAssistant } from './assistant-context'
import { EffortMenu, ModelMenu } from './model-menu'
import { DisabledPrompt, SetupPill } from './setup-pill'

// The overview's prompt is the large one: it starts taller and grows with its text up to a point,
// then scrolls (shadcn's Textarea uses field-sizing-content).
const homePromptTextarea = 'min-h-28 max-h-64 p-4 text-base md:text-base'

const suggestions: MessageKey[] = ['suggestionNewPage', 'suggestionDrafts', 'suggestionSEO']

// The overview's large prompt: shadcn's Prompt Input (with the Model Selector menus) and Suggestion
// buttons below it. Sending starts a new chat on the full AI page. The floating bar isn't shown on
// the overview.
export function HomePrompt({ platformAdmin, children }: { platformAdmin: boolean; children: React.ReactNode }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const router = useRouter()
  const [text, setText] = useState('')
  if (!assistant || assistant.setup.state === 'loading') {
    return (
      <>
        {children}
        <Skeleton className="h-32 w-full rounded-xl" />
      </>
    )
  }
  if (assistant.setup.state === 'missing') {
    // The pill says what's missing; administrators see the prompt greyed out until a model is connected.
    return (
      <>
        <SetupPill site={assistant.site} platformAdmin={platformAdmin} className="self-center" />
        {children}
        {platformAdmin && <DisabledPrompt site={assistant.site} textareaClassName={homePromptTextarea} />}
      </>
    )
  }
  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    assistant!.startChat(trimmed)
    setText('')
    router.push(`/admin/${assistant!.site}/ai`)
  }

  return (
    <>
      {children}
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
              className={homePromptTextarea}
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
              <ModelMenu className="ml-auto" />
              <EffortMenu />
              <InputGroupButton type="submit" size="icon-sm" variant="default" className="rounded-full" aria-label={t('send')} disabled={!text.trim()}>
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <div className="flex scroll-fade-x gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
          {suggestions.map((key) => (
            <Button key={key} type="button" variant="outline" size="sm" className="shrink-0" onClick={() => send(t(key))}>
              {t(key)}
            </Button>
          ))}
        </div>
      </div>
    </>
  )
}

'use client'

import { HistoryIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useI18n } from '../client/i18n-provider'
import { useAssistant } from './assistant-context'
import { ChatHistory } from './chat-history'
import { Conversation } from './conversation'

// The full-page assistant: history beside the conversation; on mobile the history opens in a sheet.
export function AssistantPage({ thread, platformAdmin }: { thread?: number; platformAdmin: boolean }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const [history, setHistory] = useState(false)
  const openThread = assistant?.openThread

  useEffect(() => {
    if (thread && openThread) openThread(thread).catch(() => undefined)
  }, [thread, openThread])

  if (!assistant) return null
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-72 shrink-0 flex-col border-r p-4 md:flex">
        <ChatHistory />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end px-4 pt-3 md:hidden">
          <Sheet open={history} onOpenChange={setHistory}>
            <SheetTrigger render={<Button variant="outline" size="sm" />}>
              <HistoryIcon data-icon="inline-start" />
              {t('history')}
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{t('history')}</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                <ChatHistory onSelect={() => setHistory(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <Conversation platformAdmin={platformAdmin} />
      </div>
    </div>
  )
}

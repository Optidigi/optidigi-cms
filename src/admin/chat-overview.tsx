'use client'

import { ArrowUpRight, FileText, ListChecks, MessageCircle, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useAdminTranslations } from './i18n-context'

const suggestions = [
  { icon: PenLine, text: 'Stel een opzet voor een nieuw artikel voor.' },
  { icon: FileText, text: 'Vat de huidige pagina samen.' },
  { icon: ListChecks, text: 'Maak een checklist voor publicatie.' },
]

export function ChatOverview({
  contextual,
  enabled,
  onSelect,
}: {
  contextual: boolean
  enabled: boolean
  onSelect: (prompt: string) => void
}) {
  const t = useAdminTranslations()
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-1 py-8 sm:py-14">
      <Empty className="items-start border-0 p-0 text-start">
        <EmptyHeader className="items-start">
          <EmptyMedia variant="icon">
            <MessageCircle aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{t('Hoe kan ik helpen?')}</EmptyTitle>
          <EmptyDescription>
            {t('Vraag iets over je website of maak samen een concept.')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      {enabled && (
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions
            .filter((_, index) => contextual || index !== 1)
            .map(({ icon: Icon, text }) => (
              <Button
                variant="outline"
                key={text}
                type="button"
                onClick={() => onSelect(t(text))}
                className="h-auto min-h-12 justify-start whitespace-normal px-3 py-2 text-start"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">{t(text)}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </Button>
            ))}
        </div>
      )}
    </div>
  )
}

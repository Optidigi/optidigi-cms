'use client'

import { ArrowUpRight, FileText, ListChecks, MessageCircle, PenLine } from 'lucide-react'
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
      <div className="flex flex-col items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('Hoe kan ik helpen?')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('Vraag iets over je website of maak samen een concept.')}
        </p>
      </div>
      {enabled && (
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions
            .filter((_, index) => contextual || index !== 1)
            .map(({ icon: Icon, text }) => (
              <button
                key={text}
                type="button"
                onClick={() => onSelect(t(text))}
                className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3 text-start text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">{t(text)}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

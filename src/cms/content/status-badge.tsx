import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Translate } from '../i18n'

// `hint` explains a draft in a tooltip; leave it off inside links and table rows.
export function StatusBadge({ status, t, hint = false }: { status?: string | null; t: Translate; hint?: boolean }) {
  if (status === 'published') return <Badge variant="secondary">{t('published')}</Badge>
  if (!hint) return <Badge variant="outline">{t('draft')}</Badge>
  // "Draft" alone doesn't tell people the change isn't on the website yet.
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant="outline" tabIndex={0} />}>{t('draft')}</TooltipTrigger>
      <TooltipContent>{t('draftHint')}</TooltipContent>
    </Tooltip>
  )
}

export function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

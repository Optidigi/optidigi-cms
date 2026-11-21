import { Badge } from '@/components/ui/badge'
import type { Translate } from '../i18n'

export function StatusBadge({ status, t }: { status?: string | null; t: Translate }) {
  return status === 'published' ? (
    <Badge variant="secondary">{t('published')}</Badge>
  ) : (
    <Badge variant="outline">{t('draft')}</Badge>
  )
}

export function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

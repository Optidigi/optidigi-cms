'use client'

import { Globe2 } from 'lucide-react'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setInterfaceLanguage } from './language-action'
import { useComparisonTranslations, useInterfaceLanguage } from './i18n-context'

const languages = { nl: 'Nederlands', en: 'English' } as const

export function InterfaceLanguageMenu() {
  const current = useInterfaceLanguage()
  const t = useComparisonTranslations()
  const [pending, change] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="ghost" aria-label={t('Taal')} disabled={pending} />}
      >
        <Globe2 aria-hidden="true" /> <span className="hidden sm:inline">{t('Taal')}</span>{' '}
        {current.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => change(() => setInterfaceLanguage(value))}
        >
          <DropdownMenuLabel>{t('Taal')}</DropdownMenuLabel>
          {Object.entries(languages).map(([code, label]) => (
            <DropdownMenuRadioItem key={code} value={code} closeOnClick>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

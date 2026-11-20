'use client'

import { useTransition } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
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
import { useAdminTranslations, useInterfaceLanguage } from './i18n-context'

const languages = { nl: 'Nederlands', en: 'English' } as const

export function InterfaceLanguageMenu() {
  const ready = useHydrated()
  const current = useInterfaceLanguage()
  const t = useAdminTranslations()
  const [pending, change] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="ghost" aria-label={t('Taal')} disabled={pending || !ready} />
        }
      >
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

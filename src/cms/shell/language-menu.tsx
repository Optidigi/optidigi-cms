'use client'

import { LanguagesIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLanguage } from '../i18n'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { usePreferences } from './preferences-context'

export function LanguageMenu() {
  const { t, language } = useI18n()
  const preferences = usePreferences()
  const router = useRouter()

  async function change(value: unknown) {
    if (!isLanguage(value) || value === language) return
    await savePreferences(preferences, { language: value })
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={t('interfaceLanguage')} />}>
        <LanguagesIcon />
        <span className="uppercase">{language}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('interfaceLanguage')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={language} onValueChange={change}>
            <DropdownMenuRadioItem value="nl">{t('dutch')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en">{t('english')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

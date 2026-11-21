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
import { isLanguage, languageCookie } from '../i18n'
import { useI18n } from '../client/i18n-provider'

// The language menu for the sign-in screens. Nobody is signed in yet, so the choice goes in the
// language cookie that the server reads for signed-out visitors.
export function AuthLanguageMenu() {
  const { t, language } = useI18n()
  const router = useRouter()

  function change(value: unknown) {
    if (!isLanguage(value) || value === language) return
    document.cookie = `${languageCookie}=${value}; path=/; max-age=31536000; samesite=lax`
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

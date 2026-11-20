'use client'

import { Globe2, Languages } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setContentLanguage, setInterfaceLanguage } from './language-action'
import { useComparisonTranslations, useEditingGuard, useInterfaceLanguage } from './i18n-context'

const languages = { nl: 'Nederlands', en: 'English' } as const

export function InterfaceLanguageMenu() {
  const current = useInterfaceLanguage()
  const t = useComparisonTranslations()
  const [pending, change] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="ghost" aria-label={t('Interfacetaal')} disabled={pending} />
        }
      >
        <Globe2 aria-hidden="true" /> <span className="hidden sm:inline">Interface</span>{' '}
        {current.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => change(() => setInterfaceLanguage(value))}
        >
          <DropdownMenuLabel>{t('Interfacetaal')}</DropdownMenuLabel>
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

export function ContentLanguageMenu({
  locale,
  disabled = false,
}: {
  locale: 'nl' | 'en'
  disabled?: boolean
}) {
  const { canNavigate } = useEditingGuard()
  const [pending, change] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()
  const t = useComparisonTranslations()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            aria-label={t('Inhoudstaal')}
            disabled={disabled || pending}
          />
        }
      >
        <Languages aria-hidden="true" />{' '}
        <span className="hidden sm:inline">{t(locale === 'en' ? 'Inhoud EN' : 'Inhoud NL')}</span>
        <span className="sm:hidden">{locale.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('Inhoudstaal')}</DropdownMenuLabel>
          {Object.entries(languages).map(([code, label]) => {
            const params = new URLSearchParams(query)
            params.set('locale', code)
            return (
              <DropdownMenuItem
                key={code}
                aria-current={locale === code ? 'true' : undefined}
                onClick={() => {
                  if (
                    locale === code ||
                    !canNavigate(
                      t('Je hebt niet-opgeslagen wijzigingen. Toch van inhoudstaal wisselen?'),
                    )
                  )
                    return
                  change(async () => {
                    await setContentLanguage(code)
                    router.push(pathname + '?' + params)
                  })
                }}
              >
                {label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

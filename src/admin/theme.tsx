'use client'

import { useAdminTranslations } from '@/admin/i18n-context'

import { Monitor, Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from 'next-themes'
import { useEffect, type ReactNode } from 'react'
import { saveTheme } from './preference-actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AdminTheme({ children, theme }: { children: ReactNode; theme?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme ?? 'system'}
      enableSystem
      disableTransitionOnChange
      storageKey={theme ? 'optidigi-admin-theme-' + theme : 'optidigi-admin-theme'}
    >
      <ApplyTheme theme={theme} />
      {children}
    </ThemeProvider>
  )
}

function ApplyTheme({ theme }: { theme?: string }) {
  const { setTheme } = useTheme()
  useEffect(() => {
    if (theme) setTheme(theme)
  }, [theme, setTheme])
  return null
}

export function AppearanceMenu() {
  const t = useAdminTranslations()

  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon-sm" variant="ghost" aria-label={t('Weergave')} />}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme ?? 'system'}
          onValueChange={(value) => {
            setTheme(value)
            void saveTheme(value)
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun />
            {t('Licht')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            {t('Donker')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            {t('Systeem')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

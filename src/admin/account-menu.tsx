'use client'

import Link from 'next/link'
import { LogOut, Settings2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminTranslations, useEditingGuard } from './i18n-context'
import { signOutAdmin } from './session'

export function AccountMenu({ website, platform }: { website?: number; platform?: boolean }) {
  const t = useAdminTranslations()
  const { canNavigate } = useEditingGuard()
  const suffix = website ? '?website=' + website : ''
  function guard(event: { preventDefault: () => void }) {
    if (!canNavigate(t('Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?')))
      event.preventDefault()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t('Mijn account')} />}
      >
        <UserRound />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={'/admin/account' + suffix} onNavigate={guard} />}>
          <UserRound />
          {t('Mijn account')}
        </DropdownMenuItem>
        {platform && (
          <DropdownMenuItem render={<Link href={'/admin/platform' + suffix} onNavigate={guard} />}>
            <Settings2 />
            {t('Platformbeheer')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(event) => {
            guard(event)
            if (!event.defaultPrevented) void signOutAdmin()
          }}
        >
          <LogOut />
          {t('Uitloggen')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

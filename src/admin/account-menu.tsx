'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { settingsHref } from './navigation'
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

export function AccountMenu({
  website,
  platform,
  locale,
}: {
  website?: number
  platform?: boolean
  locale?: 'nl' | 'en'
}) {
  const t = useAdminTranslations()
  const { navigate, hasChanges } = useEditingGuard()
  const router = useRouter()
  const account = settingsHref('/admin/account', website, locale)
  const platformRoute = settingsHref('/admin/platform', website, locale)
  function guard(href: string, event: { preventDefault: () => void }) {
    if (!hasChanges()) return
    event.preventDefault()
    navigate(() => router.push(href))
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t('Mijn account')} />}
      >
        <UserRound />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={account} onNavigate={(event) => guard(account, event)} />}
        >
          <UserRound />
          {t('Mijn account')}
        </DropdownMenuItem>
        {platform && (
          <DropdownMenuItem
            render={
              <Link href={platformRoute} onNavigate={(event) => guard(platformRoute, event)} />
            }
          >
            <Settings2 />
            {t('Platformbeheer')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(() => void signOutAdmin())}>
          <LogOut />
          {t('Uitloggen')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

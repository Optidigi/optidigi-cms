'use client'

import { ChevronDownIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { MessageKey } from '../i18n'
import { useI18n } from '../client/i18n-provider'

type Group = { label: MessageKey; items: { label: MessageKey; href: string }[] }

// One settings navigation for website, account and platform settings.
export function SettingsNav({ site, platformAdmin }: { site?: number; platformAdmin: boolean }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const groups: Group[] = [
    ...(site
      ? [{
          label: 'websiteSettings' as const,
          items: [
            { label: 'general' as const, href: `/admin/${site}/settings/general` },
            { label: 'navigation' as const, href: `/admin/${site}/settings/navigation` },
            { label: 'seo' as const, href: `/admin/${site}/settings/seo` },
            { label: 'assistant' as const, href: `/admin/${site}/settings/assistant` },
          ],
        }]
      : []),
    {
      label: 'account',
      items: [
        { label: 'profile', href: '/admin/account/profile' },
        { label: 'preferences', href: '/admin/account/preferences' },
      ],
    },
    ...(platformAdmin
      ? [{
          label: 'platform' as const,
          items: [
            { label: 'websites' as const, href: '/admin/platform/websites' },
            { label: 'users' as const, href: '/admin/platform/users' },
          ],
        }]
      : []),
  ]
  const active = groups.flatMap(({ items }) => items).find(({ href }) => pathname === href || pathname.startsWith(href + '/'))

  return (
    <>
      <nav aria-label={t('settings')} className="hidden w-48 shrink-0 flex-col gap-6 md:flex">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">{t(group.label)}</p>
            {group.items.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className={cn('justify-start', active?.href === item.href && 'bg-muted')}
                aria-current={active?.href === item.href ? 'page' : undefined}
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                {t(item.label)}
              </Button>
            ))}
          </div>
        ))}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="justify-between md:hidden" />}>
          {active ? t(active.label) : t('settings')}
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          {groups.map((group, index) => (
            <DropdownMenuGroup key={group.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{t(group.label)}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                  {t(item.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings2 } from 'lucide-react'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SettingsLink } from './settings-link'
import { siteHref } from './navigation'
import { useAdminTranslations } from './i18n-context'

export function SettingsNavigation({
  site,
  membership,
  platform,
  mode = 'rail',
}: {
  site?: { id: number; name: string }
  membership?: { canManage: boolean }
  platform?: boolean
  mode?: 'rail' | 'mobile'
}) {
  const [open, setOpen] = useState(false)
  const t = useAdminTranslations()
  const path = usePathname()
  const query = useSearchParams()
  const locale = query.get('locale') === 'en' ? 'en' : 'nl'
  const current = path.endsWith('/preferences')
    ? 'preferences'
    : path.endsWith('/account')
      ? 'personal'
      : path.endsWith('/platform')
        ? query.get('group') === 'users' || query.has('user')
          ? 'users'
          : 'platform'
        : path.endsWith('/assistant')
          ? 'assistant'
          : path.endsWith('/members')
            ? 'members'
            : path.endsWith('/site-settings')
              ? 'website'
              : 'overview'
  const canManage = membership?.canManage || platform
  const suffix = '?' + new URLSearchParams({ ...(site && { website: String(site.id) }), locale })
  const groups = [
    ...(site
      ? [
          {
            title: site.name,
            links: [
              {
                key: 'website',
                label: t('Website-instellingen'),
                href: siteHref(site.id, '/site-settings', locale),
              },
            ],
          },
        ]
      : []),
    ...(site && canManage
      ? [
          {
            title: t('Websitetoegang'),
            links: [
              {
                key: 'members',
                label: t('Leden en rollen'),
                href: siteHref(site.id, '/settings/members', locale),
              },
            ],
          },
        ]
      : []),
    ...(site && membership
      ? [
          {
            title: t('Integraties'),
            links: [
              {
                key: 'assistant',
                label: t('AI-assistent'),
                href: siteHref(site.id, '/settings/assistant', locale),
              },
            ],
          },
        ]
      : []),
    {
      title: t('Persoonlijk'),
      links: [
        { key: 'personal', label: t('Mijn account'), href: '/admin/account' + suffix },
        { key: 'preferences', label: t('Voorkeuren'), href: '/admin/account/preferences' + suffix },
      ],
    },
    ...(platform
      ? [
          {
            title: t('Platform'),
            links: [
              { key: 'platform', label: t('Websites'), href: '/admin/platform' + suffix },
              {
                key: 'users',
                label: t('Gebruikers'),
                href: '/admin/platform' + suffix + '&group=users',
              },
            ],
          },
        ]
      : []),
  ]

  const links = (onNavigate?: () => void) => (
    <nav aria-label={t('Instellingen')} className="space-y-5">
      {groups.map(({ title, links }) => (
        <SidebarGroup key={links[0].key} className="min-w-0 p-0">
          <SidebarGroupLabel>{title}</SidebarGroupLabel>
          <SidebarMenu>
            {links.map(({ key, label, href }) => (
              <SettingsLink
                key={key}
                href={href}
                label={label}
                active={current === key}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </nav>
  )
  if (mode === 'rail')
    return <aside className="hidden border-e px-3 py-6 xl:block">{links()}</aside>

  return (
    <div className="xl:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={t('Instellingen')} />}
        >
          <Settings2 />
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>{t('Instellingen')}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto space-y-4 p-4">
            <SidebarMenu>
              <SettingsLink
                href={site ? siteHref(site.id, '', locale) : '/admin'}
                label={t('CMS-overzicht')}
                active={false}
                onNavigate={() => setOpen(false)}
              />
            </SidebarMenu>
            {links(() => setOpen(false))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

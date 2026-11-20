'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SettingsLink } from './settings-link'
import { siteHref } from './navigation'
import { useAdminTranslations } from './i18n-context'

export function SettingsNavigation({
  site,
  membership,
  platform,
}: {
  site?: { id: number; name: string }
  membership?: { canManage: boolean }
  platform?: boolean
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
                href: siteHref(site.id, '/settings/members'),
              },
            ],
          },
        ]
      : []),
    ...(site && membership
      ? [
          {
            title: t('AI-assistent'),
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
        <div key={title} className="min-w-0">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{title}</p>
          {links.map(({ key, label, href }) => (
            <SettingsLink
              key={key}
              href={href}
              label={label}
              active={current === key}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  )
  return (
    <>
      <aside className="hidden border-e px-3 py-6 lg:block">{links()}</aside>
      <div className="px-4 pt-3 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <Settings2 />
            {t('Instellingen')}
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{t('Instellingen')}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4">{links(() => setOpen(false))}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

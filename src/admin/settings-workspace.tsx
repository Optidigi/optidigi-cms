import type { ReactNode } from 'react'
import { SettingsLink } from './settings-link'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { isPlatformAdmin } from '@/site/access'
import { assistantMemberships } from '@/assistant/scope-shared'
import { adminRequest } from './data'
import { adminTranslations } from './i18n-server'
import { siteHref } from './navigation'
import { PageContainer } from './page-container'
import { AdminShell } from './shell'

type Website = { id: number; name: string }
type SettingsPage =
  | 'overview'
  | 'website'
  | 'navigation'
  | 'seo'
  | 'members'
  | 'assistant'
  | 'models'
  | 'defaults'
  | 'personal'
  | 'platform'
  | 'users'

export async function SettingsWorkspace({
  site,
  current,
  title,
  action,
  locale = 'nl',
  children,
}: {
  site?: Website
  current: SettingsPage
  title: string
  action?: ReactNode
  locale?: 'nl' | 'en'
  children: ReactNode
}) {
  const [{ user }, t] = await Promise.all([adminRequest(), adminTranslations()])
  const membership = assistantMemberships(user).find(({ id }) => id === site?.id)
  const canManage = membership?.canManage || isPlatformAdmin(user)
  const suffix = site ? '?website=' + site.id : ''
  const groups = [
    ...(site
      ? [
          {
            title: site.name,
            links: [
              {
                key: 'overview',
                label: t('Instellingen'),
                href: siteHref(site.id, '/settings', locale),
              },
              {
                key: 'website',
                label: t('Algemeen'),
                href: siteHref(site.id, '/site-settings', locale),
              },
              {
                key: 'navigation',
                label: t('Navigatie'),
                href:
                  siteHref(site.id, '/site-settings', locale) +
                  (locale === 'en' ? '&' : '?') +
                  'panel=navigation',
              },
              {
                key: 'seo',
                label: 'SEO',
                href:
                  siteHref(site.id, '/site-settings', locale) +
                  (locale === 'en' ? '&' : '?') +
                  'panel=seo',
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
                key: 'models',
                label: t('Modellen'),
                href: siteHref(site.id, '/settings/assistant?panel=models'),
              },
              ...(membership.canManage
                ? [
                    {
                      key: 'defaults',
                      label: t('Assistentvoorkeuren'),
                      href: siteHref(site.id, '/settings/assistant?panel=defaults'),
                    },
                  ]
                : []),
              {
                key: 'assistant',
                label: t('Modelverbinding'),
                href: siteHref(site.id, '/settings/assistant'),
              },
            ],
          },
        ]
      : []),
    {
      title: t('Persoonlijk'),
      links: [{ key: 'personal', label: t('Mijn account'), href: '/admin/account' + suffix }],
    },
    ...(isPlatformAdmin(user)
      ? [
          {
            title: t('Platform'),
            links: [
              { key: 'platform', label: t('Websites'), href: '/admin/platform' + suffix },
              {
                key: 'users',
                label: t('Gebruikers'),
                href: '/admin/platform?group=users' + (site ? '&website=' + site.id : ''),
              },
            ],
          },
        ]
      : []),
  ]

  return (
    <PageContainer title={title} description={site?.name} action={action}>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          aria-label={t('Instellingen')}
          className="flex min-w-0 flex-wrap gap-3 rounded-xl border bg-card p-3 lg:flex-col lg:gap-5"
        >
          {groups.map(({ title, links }) => (
            <div key={title} className="min-w-0">
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{title}</p>
              {links.map(({ key, label, href }) => (
                <SettingsLink key={key} href={href} label={label} active={current === key} />
              ))}
            </div>
          ))}
        </nav>
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </PageContainer>
  )
}

export async function GlobalSettingsShell({
  sites,
  selected,
  platform,
  children,
}: {
  sites: Website[]
  selected?: Website
  platform: boolean
  children: ReactNode
}) {
  const [{ user }, jar] = await Promise.all([adminRequest(), cookies()])
  const sidebarOpen = jar.get('sidebar_state')?.value !== 'false'
  const membership = selected && assistantMemberships(user).find(({ id }) => id === selected.id)
  return (
    <Suspense>
      <AdminShell
        sites={sites}
        selected={selected}
        platform={platform}
        sidebarOpen={sidebarOpen}
        assistant={membership && selected ? { ...membership, name: selected.name } : undefined}
      >
        {children}
      </AdminShell>
    </Suspense>
  )
}

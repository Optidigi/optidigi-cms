'use client'

import {
  BotMessageSquareIcon,
  BriefcaseIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ImageIcon,
  LayoutDashboardIcon,
  NewspaperIcon,
  SettingsIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { MessageKey } from '../i18n'
import type { Preferences } from '../preferences'
import { useI18n } from '../client/i18n-provider'
import { enabledSections, type Section } from '../sections'
import { savePreferences } from '../client/preferences'
import { NavUser } from './nav-user'
import { SiteIdentity, type SiteSummary } from './site-identity'

type NavItem = { key: MessageKey; path: string; icon: React.ReactNode; exact?: boolean; section?: Section }

const workspace: NavItem[] = [
  { key: 'overview', path: '', icon: <LayoutDashboardIcon />, exact: true },
  { key: 'assistant', path: '/ai', icon: <BotMessageSquareIcon /> },
]
const content: NavItem[] = [
  { key: 'pages', path: '/pages', icon: <GlobeIcon />, section: 'pages' },
  { key: 'articles', path: '/articles', icon: <NewspaperIcon />, section: 'articles' },
  { key: 'portfolio', path: '/portfolio', icon: <BriefcaseIcon />, section: 'portfolio' },
  { key: 'media', path: '/media', icon: <ImageIcon /> },
]

// Composition of the official shadcn sidebar blocks: sidebar-07's navigation in sidebar-08's inset
// layout. Website work at the top, settings (which include the platform pages) at the bottom.
export function AppSidebar({
  sites,
  fallbackSite,
  user,
  preferences,
  platformAdmin,
}: {
  sites: SiteSummary[]
  fallbackSite?: number
  user: { email: string }
  preferences: Preferences
  platformAdmin: boolean
}) {
  const { t } = useI18n()
  const pathname = usePathname()
  const params = useParams<{ site?: string }>()
  const current = params.site ? Number(params.site) : fallbackSite
  const site = sites.find(({ id }) => id === current)

  // Remember the last website so /admin and the account pages return to it.
  useEffect(() => {
    if (site && preferences.site !== site.id) {
      savePreferences(preferences, { site: site.id }).catch(() => undefined)
    }
  }, [site, preferences])

  function group(label: MessageKey | undefined, items: NavItem[]) {
    if (!site) return null
    const base = `/admin/${site.id}`
    return (
      <SidebarGroup>
        {label && <SidebarGroupLabel>{t(label)}</SidebarGroupLabel>}
        <SidebarMenu>
          {items.map((item) => {
            const href = base + item.path
            const active = item.exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton isActive={active} tooltip={t(item.key)} render={<Link href={href} />}>
                  {item.icon}
                  <span>{t(item.key)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  // Website, account and platform settings share one settings area.
  const settingsHref = site ? `/admin/${site.id}/settings` : platformAdmin ? '/admin/platform/websites' : '/admin/account/profile'
  const inSettings =
    (site && pathname.startsWith(`/admin/${site.id}/settings`)) || pathname.startsWith('/admin/platform') || pathname.startsWith('/admin/account')

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SiteIdentity site={site} />
      </SidebarHeader>
      <SidebarContent>
        {group(undefined, workspace)}
        {site && group('content', content.filter(({ section }) => !section || enabledSections(site).includes(section)))}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            {site && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={t('viewWebsite')} render={<a href={site.siteOrigin} target="_blank" rel="noreferrer" />}>
                  <ExternalLinkIcon />
                  <span>{t('viewWebsite')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton isActive={Boolean(inSettings)} tooltip={t('settings')} render={<Link href={settingsHref} />}>
                <SettingsIcon />
                <span>{t('settings')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={user.email} sites={sites} current={site} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

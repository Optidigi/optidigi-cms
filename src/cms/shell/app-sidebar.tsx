'use client'

import {
  BookOpenIcon,
  SparklesIcon,
  BriefcaseIcon,
  FileTextIcon,
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
import { SiteSwitcher, type SiteSummary } from './site-switcher'

type NavItem = { key: MessageKey; path: string; icon: React.ReactNode; exact?: boolean; section?: Section }

const workspace: NavItem[] = [
  { key: 'overview', path: '', icon: <LayoutDashboardIcon />, exact: true },
]
const content: NavItem[] = [
  { key: 'pages', path: '/pages', icon: <FileTextIcon />, section: 'pages' },
  { key: 'articles', path: '/articles', icon: <NewspaperIcon />, section: 'articles' },
  { key: 'portfolio', path: '/portfolio', icon: <BriefcaseIcon />, section: 'portfolio' },
  { key: 'media', path: '/media', icon: <ImageIcon /> },
]
const tools: NavItem[] = [
  { key: 'assistant', path: '/ai', icon: <SparklesIcon /> },
  { key: 'settings', path: '/settings', icon: <SettingsIcon /> },
]

// Composition of the official shadcn sidebar-07 block.
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SiteSwitcher sites={sites} current={site} />
      </SidebarHeader>
      <SidebarContent>
        {group(undefined, workspace)}
        {site && group('content', content.filter(({ section }) => !section || enabledSections(site).includes(section)))}
        {group(undefined, tools)}
        {platformAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/admin/platform')}
                  tooltip={t('platform')}
                  render={<Link href="/admin/platform/websites" />}
                >
                  <BookOpenIcon />
                  <span>{t('platform')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

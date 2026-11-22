'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useI18n } from '../client/i18n-provider'

export type SiteSummary = { id: number; name: string; siteOrigin: string; sections?: string[] | null }

function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?'
}

// The website's own favicon, or its initials while it loads or when it has none.
export function SiteAvatar({ site, size }: { site?: SiteSummary; size: 'sm' | 'default' }) {
  return (
    <Avatar size={size} className="rounded-lg after:rounded-lg">
      {site && <AvatarImage src={new URL('/favicon.ico', site.siteOrigin).href} alt="" className="rounded-lg bg-background p-1" />}
      <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
        {initials(site?.name ?? 'CMS')}
      </AvatarFallback>
    </Avatar>
  )
}

// The sidebar header: the website's logo and name, linking to its overview (the plain header of
// the official sidebar blocks). Switching websites lives in the account menu at the bottom.
export function SiteIdentity({ site }: { site?: SiteSummary }) {
  const { t } = useI18n()
  const content = (
    <>
      <SiteAvatar site={site} size="default" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{site?.name ?? t('appName')}</span>
        {site && <span className="truncate text-xs text-muted-foreground">{new URL(site.siteOrigin).host}</span>}
      </div>
    </>
  )
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {site ? (
          <SidebarMenuButton size="lg" tooltip={site.name} render={<Link href={`/admin/${site.id}`} />}>
            {content}
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton size="lg" render={<div />}>
            {content}
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

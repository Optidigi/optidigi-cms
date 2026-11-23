'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useI18n } from '../client/i18n-provider'

export type SiteSummary = {
  id: number
  name: string
  siteOrigin: string
  sections?: string[] | null
  // From the website's settings: its logo, the logo for dark mode and the square icon.
  logo?: string | null
  logoDark?: string | null
  icon?: string | null
}

function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?'
}

// The website's square icon, else its favicon, else its initials (also while the image loads).
export function SiteAvatar({ site, size, className }: { site?: SiteSummary; size: 'sm' | 'default'; className?: string }) {
  const src = site ? (site.icon ?? new URL('/favicon.ico', site.siteOrigin).href) : undefined
  return (
    <Avatar size={size} className={cn('rounded-lg after:rounded-lg', className)}>
      {src && <AvatarImage src={src} alt="" className="rounded-lg bg-background object-contain p-1" />}
      <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
        {initials(site?.name ?? 'CMS')}
      </AvatarFallback>
    </Avatar>
  )
}

// The website's logo. Without a dark-mode logo, dark mode shows the logo on a light background.
function SiteLogo({ site }: { site: SiteSummary & { logo: string } }) {
  const image = 'h-6 w-auto max-w-full object-contain object-left'
  /* eslint-disable @next/next/no-img-element -- Payload serves the original upload; SVGs stay as images. */
  return site.logoDark ? (
    <>
      <img src={site.logo} alt={site.name} className={cn(image, 'dark:hidden')} />
      <img src={site.logoDark} alt={site.name} className={cn(image, 'hidden dark:block')} />
    </>
  ) : (
    <img src={site.logo} alt={site.name} className={cn(image, 'dark:rounded-md dark:bg-white dark:px-1.5 dark:py-1 dark:box-content dark:h-5')} />
  )
  /* eslint-enable @next/next/no-img-element */
}

// The sidebar header: the website's logo (or icon and name), linking to its overview (the plain
// header of the official sidebar blocks). Collapsed, only the square icon shows. Switching websites
// lives in the account menu at the bottom.
export function SiteIdentity({ site }: { site?: SiteSummary }) {
  const { t } = useI18n()
  const host = site && <span className="truncate text-xs text-muted-foreground">{new URL(site.siteOrigin).host}</span>
  const content =
    site?.logo ? (
      <>
        <SiteAvatar site={site} size="default" className="hidden group-data-[collapsible=icon]:flex" />
        <div className="grid min-w-0 flex-1 gap-1 text-left group-data-[collapsible=icon]:hidden">
          <SiteLogo site={{ ...site, logo: site.logo }} />
          {host}
        </div>
      </>
    ) : (
      <>
        <SiteAvatar site={site} size="default" />
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{site?.name ?? t('appName')}</span>
          {host}
        </div>
      </>
    )
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {site ? (
          <SidebarMenuButton size="lg" tooltip={site.name} className={cn(site.logo && 'h-auto min-h-12')} render={<Link href={`/admin/${site.id}`} />}>
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

'use client'

import { ChevronsUpDownIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { useI18n } from '../client/i18n-provider'

export type SiteSummary = { id: number; name: string; siteOrigin: string; sections?: string[] | null }

function initials(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?'
}

// The website's own favicon, or its initials while it loads or when it has none.
function SiteAvatar({ site, size }: { site?: SiteSummary; size: 'sm' | 'default' }) {
  return (
    <Avatar size={size} className="rounded-lg after:rounded-lg">
      {site && <AvatarImage src={new URL('/favicon.ico', site.siteOrigin).href} alt="" className="rounded-lg bg-background p-1" />}
      <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
        {initials(site?.name ?? 'CMS')}
      </AvatarFallback>
    </Avatar>
  )
}

// The team switcher from the official sidebar-07 block, listing websites.
export function SiteSwitcher({ sites, current }: { sites: SiteSummary[]; current?: SiteSummary }) {
  const { t } = useI18n()
  const { isMobile } = useSidebar()
  const router = useRouter()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <SiteAvatar site={current} size="default" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{current?.name ?? t('websites')}</span>
              <span className="truncate text-xs">{current ? new URL(current.siteOrigin).host : t('appName')}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit min-w-56" align="start" side={isMobile ? 'bottom' : 'right'} sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t('websites')}</DropdownMenuLabel>
              {sites.map((site) => (
                <DropdownMenuItem key={site.id} onClick={() => router.push(`/admin/${site.id}`)} className="gap-2 p-2">
                  <SiteAvatar site={site} size="sm" />
                  <span className="truncate">{site.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

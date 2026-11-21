'use client'

import { ChevronsUpDownIcon, GlobeIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GlobeIcon className="size-4" />
            </div>
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
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <GlobeIcon className="size-3.5" />
                  </div>
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

'use client'

import { ArrowLeftRightIcon, ChevronsUpDownIcon, LogOutIcon, PaletteIcon, SlidersHorizontalIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { isLanguage, type MessageKey } from '../i18n'
import { themes, type Preferences, type Theme } from '../preferences'
import { usePreferences } from './preferences-context'
import { SiteAvatar, type SiteSummary } from './site-identity'

const themeLabels: Record<Theme, MessageKey> = { system: 'system', light: 'light', dark: 'dark' }

// The nav-user menu from the official sidebar-07 block, with submenus (shadcn's DropdownMenuSub)
// to switch websites and to change the theme and language without leaving the page.
export function NavUser({ email, sites, current }: { email: string; sites: SiteSummary[]; current?: SiteSummary }) {
  const { t, language } = useI18n()
  const { isMobile } = useSidebar()
  const router = useRouter()
  const preferences = usePreferences()
  const { theme, setTheme } = useTheme()
  const initials = email.slice(0, 2).toUpperCase()
  const side = isMobile ? 'bottom' : 'right'

  async function signOut() {
    await api('users/logout', { method: 'POST' }).catch(() => undefined)
    router.replace('/admin/login')
    router.refresh()
  }

  // Saved like the appearance page does, so both stay the same.
  async function change(update: Partial<Preferences>) {
    if (update.theme) setTheme(update.theme)
    try {
      await savePreferences(preferences, update)
      // The language is rendered on the server.
      router.refresh()
    } catch {
      toast.error(t('saveFailed'))
    }
  }

  const identity = (
    <>
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{email}</span>
      </div>
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}>
            {identity}
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit min-w-56" side={side} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">{identity}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {sites.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowLeftRightIcon />
                    {t('switchWebsite')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-fit min-w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t('websites')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={current ? String(current.id) : ''} onValueChange={(value) => router.push(`/admin/${value}`)}>
                        {sites.map((site) => (
                          <DropdownMenuRadioItem key={site.id} value={String(site.id)} closeOnClick className="gap-2">
                            <SiteAvatar site={site} size="sm" />
                            <span className="truncate">{site.name}</span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem render={<Link href="/admin/account/profile" />}>
                <UserIcon />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PaletteIcon />
                  {t('appearance')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={theme ?? preferences.theme} onValueChange={(value) => change({ theme: value as Theme })}>
                      {themes.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {t(themeLabels[option])}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('interfaceLanguage')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={language}
                      onValueChange={(value) => isLanguage(value) && value !== language && change({ language: value })}
                    >
                      <DropdownMenuRadioItem value="nl">{t('dutch')}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="en">{t('english')}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/admin/account/appearance" />}>
                    <SlidersHorizontalIcon />
                    {t('allAppearanceSettings')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOutIcon />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

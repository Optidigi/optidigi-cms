'use client'

import { ChevronsUpDownIcon, LogOutIcon, SlidersHorizontalIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'

// The nav-user menu from the official sidebar-07 block.
export function NavUser({ email }: { email: string }) {
  const { t } = useI18n()
  const { isMobile } = useSidebar()
  const router = useRouter()
  const initials = email.slice(0, 2).toUpperCase()

  async function signOut() {
    await api('users/logout', { method: 'POST' }).catch(() => undefined)
    router.replace('/admin/login')
    router.refresh()
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
          <DropdownMenuContent className="w-fit min-w-56" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">{identity}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/admin/account/profile" />}>
                <UserIcon />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/account/preferences" />}>
                <SlidersHorizontalIcon />
                {t('preferences')}
              </DropdownMenuItem>
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

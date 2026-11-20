'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useEditingGuard } from './i18n-context'

export function SettingsLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string
  label: string
  active: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const { hasChanges, navigate } = useEditingGuard()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            onNavigate={(event) => {
              if (active) {
                event.preventDefault()
                onNavigate?.()
                return
              }
              if (!hasChanges()) {
                onNavigate?.()
                return
              }
              event.preventDefault()
              navigate(() => {
                onNavigate?.()
                router.push(href)
              })
            }}
          />
        }
      >
        {label}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

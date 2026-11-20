'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { AdminShell } from './shell'

export function WorkspaceShell({
  sites,
  memberships,
  platform,
  sidebarOpen,
  children,
}: {
  sites: { id: number; name: string }[]
  memberships: { id: number; canManage: boolean }[]
  platform: boolean
  sidebarOpen: boolean
  children: ReactNode
}) {
  const pathname = usePathname()
  const query = useSearchParams()
  const requested = Number(pathname.match(/^\/admin\/(\d+)(?:\/|$)/)?.[1] ?? query.get('website'))
  const selected = sites.find(({ id }) => id === requested) ?? sites[0]
  useEffect(() => {
    if (selected && /^\/admin\/\d+(?:\/|$)/.test(pathname)) {
      document.cookie =
        'optidigi-last-website=' +
        selected.id +
        '; Path=/admin; SameSite=Lax; Max-Age=31536000' +
        (location.protocol === 'https:' ? '; Secure' : '')
    }
  }, [selected, pathname])
  const membership = memberships.find(({ id }) => id === selected?.id)
  return (
    <AdminShell
      sites={sites}
      selected={selected}
      platform={platform}
      sidebarOpen={sidebarOpen}
      assistant={membership && selected ? { ...membership, name: selected.name } : undefined}
    >
      {children}
    </AdminShell>
  )
}

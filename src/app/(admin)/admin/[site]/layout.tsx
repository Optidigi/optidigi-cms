import { Suspense, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AdminShell } from '@/admin/shell'
import { currentSite } from '@/admin/data'
import { isPlatformAdmin } from '@/site/access'
import { assistantMemberships } from '@/assistant/scope-shared'

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ site: string }>
}) {
  const { sites, selected, req } = await currentSite((await params).site)
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false'
  const membership = assistantMemberships(req.user).find(({ id }) => id === selected.id)
  return (
    <Suspense>
      <AdminShell
        sites={sites}
        selected={selected}
        platform={isPlatformAdmin(req.user)}
        sidebarOpen={sidebarOpen}
        assistant={membership && { ...membership, name: selected.name }}
      >
        {children}
      </AdminShell>
    </Suspense>
  )
}

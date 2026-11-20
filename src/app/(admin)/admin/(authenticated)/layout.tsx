import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { adminRequest, adminSites } from '@/admin/data'
import { readPreferences } from '@/admin/preferences'
import { WorkspaceShell } from '@/admin/workspace-shell'
import { isPlatformAdmin } from '@/site/access'
import { assistantMemberships } from '@/assistant/scope-shared'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const req = await adminRequest()
  const [sites, jar, preferences] = await Promise.all([
    adminSites(req),
    cookies(),
    readPreferences(),
  ])
  return (
    <WorkspaceShell
      sites={sites}
      memberships={assistantMemberships(req.user)}
      platform={isPlatformAdmin(req.user)}
      sidebarOpen={preferences?.sidebarOpen ?? jar.get('sidebar_state')?.value !== 'false'}
    >
      {children}
    </WorkspaceShell>
  )
}

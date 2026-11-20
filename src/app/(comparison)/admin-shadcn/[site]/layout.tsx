import { Suspense, type ReactNode } from 'react'
import { ComparisonShell } from '@/admin-comparison/shell'
import { currentSite } from '@/admin-comparison/data'
import { assistantMemberships } from '@/assistant/scope-shared'

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ site: string }>
}) {
  const { sites, selected, req } = await currentSite((await params).site)
  const membership = assistantMemberships(req.user).find(({ id }) => id === selected.id)
  return (
    <Suspense>
      <ComparisonShell
        sites={sites}
        selected={selected}
        assistant={membership && { ...membership, name: selected.name }}
      >
        {children}
      </ComparisonShell>
    </Suspense>
  )
}

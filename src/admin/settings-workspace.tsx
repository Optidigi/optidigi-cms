import type { ReactNode } from 'react'
import { PageContainer } from './page-container'

export function SettingsWorkspace({
  site,
  title,
  action,
  children,
}: {
  site?: { name: string }
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <PageContainer title={title} description={site?.name} action={action}>
      <div className="min-w-0 space-y-5">{children}</div>
    </PageContainer>
  )
}

'use client'

import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAdminTranslations } from './i18n-context'
import { InterfaceLanguageMenu } from './language-menu'
import { AppearanceMenu } from './theme'

// Adapted from Next Shadcn Dashboard Starter's dashboard header.
export function AdminHeader({ breadcrumbs, children }: { breadcrumbs: ReactNode; children?: ReactNode }) {
  const t = useAdminTranslations()

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 rounded-t-[inherit] border-b bg-background px-3 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ms-1" aria-label={t('Navigatie tonen of verbergen')} />
        <Separator orientation="vertical" className="me-1 data-vertical:h-4 data-vertical:self-center" />
        {breadcrumbs}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <InterfaceLanguageMenu />
        <AppearanceMenu />
        {children}
      </div>
    </header>
  )
}

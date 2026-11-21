import { cookies } from 'next/headers'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getPreferences, getSites, requireUser } from '@/cms/server'
import { AppSidebar } from '@/cms/shell/app-sidebar'
import { PreferencesProvider } from '@/cms/shell/preferences-context'
import { isPlatformAdmin } from '@/site/access'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser()
  const [sites, preferences, jar] = await Promise.all([getSites(), getPreferences(), cookies()])
  const fallbackSite = sites.find(({ id }) => id === preferences.site)?.id ?? sites[0]?.id
  return (
    <PreferencesProvider value={preferences}>
      <SidebarProvider defaultOpen={jar.get('sidebar_state')?.value !== 'false'}>
        <AppSidebar
          sites={sites}
          fallbackSite={fallbackSite}
          user={{ email: user.email }}
          preferences={preferences}
          platformAdmin={isPlatformAdmin(user)}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </PreferencesProvider>
  )
}

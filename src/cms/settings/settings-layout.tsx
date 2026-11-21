import { getPreferences, getSites, requireUser } from '../server'
import { isPlatformAdmin } from '@/site/access'
import { SettingsNav } from './settings-nav'

// Shared frame for every settings screen: the settings navigation beside the form.
export async function SettingsFrame({ site, children }: { site?: number; children: React.ReactNode }) {
  const [{ user }, sites, preferences] = await Promise.all([requireUser(), getSites(), getPreferences()])
  const current = site ?? sites.find(({ id }) => id === preferences.site)?.id ?? sites[0]?.id
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:flex-row md:p-6">
      <SettingsNav site={current} platformAdmin={isPlatformAdmin(user)} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
    </div>
  )
}

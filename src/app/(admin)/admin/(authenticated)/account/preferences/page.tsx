import { cookies } from 'next/headers'
import { adminRequest, adminSites } from '@/admin/data'
import { getInterfaceLanguage, adminTranslations } from '@/admin/i18n-server'
import { PreferenceForm } from '@/admin/preference-form'
import { readPreferences } from '@/admin/preferences'
import { SettingsWorkspace } from '@/admin/settings-workspace'

export default async function PreferencesPage() {
  const req = await adminRequest()
  const [saved, sites, jar, language, t] = await Promise.all([
    readPreferences(),
    adminSites(req),
    cookies(),
    getInterfaceLanguage(),
    adminTranslations(),
  ])
  const initial = saved ?? {
    language,
    theme: 'system' as const,
    preset: 'optidigi' as const,
    density: 'comfortable' as const,
    sidebarOpen: jar.get('sidebar_state')?.value !== 'false',
    website: null,
  }
  return (
    <SettingsWorkspace title={t('Voorkeuren')}>
      <PreferenceForm initial={initial} savedTheme={saved?.theme} sites={sites} />
    </SettingsWorkspace>
  )
}

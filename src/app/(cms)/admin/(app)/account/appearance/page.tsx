import { getTranslator } from '@/cms/server'
import { PreferencesForm } from '@/cms/settings/preferences-form'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function AppearancePage() {
  const t = await getTranslator()
  return (
    <>
      <SiteHeader crumbs={[{ label: t('websiteSettings') }, { label: t('appearance') }]} />
      <SettingsFrame>
        <PageTitle title={t('appearance')} description={t('preferencesDescription')} />
        <PreferencesForm />
      </SettingsFrame>
    </>
  )
}

import { getTranslator } from '@/cms/server'
import { PreferencesForm } from '@/cms/settings/preferences-form'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function PreferencesPage() {
  const t = await getTranslator()
  return (
    <>
      <SiteHeader crumbs={[{ label: t('account') }, { label: t('preferences') }]} />
      <SettingsFrame>
        <PageTitle title={t('preferences')} description={t('preferencesDescription')} />
        <PreferencesForm />
      </SettingsFrame>
    </>
  )
}

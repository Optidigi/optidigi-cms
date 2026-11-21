import { getTranslator, requireUser } from '@/cms/server'
import { ProfileForm } from '@/cms/settings/profile-form'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function ProfilePage() {
  const [{ user }, t] = await Promise.all([requireUser(), getTranslator()])
  return (
    <>
      <SiteHeader crumbs={[{ label: t('account') }, { label: t('profile') }]} />
      <SettingsFrame>
        <PageTitle title={t('profile')} description={t('profileDescription')} />
        <ProfileForm id={user.id} email={user.email} />
      </SettingsFrame>
    </>
  )
}

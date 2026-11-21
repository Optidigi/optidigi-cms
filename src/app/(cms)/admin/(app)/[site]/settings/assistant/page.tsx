import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTranslator, requireSite } from '@/cms/server'
import { AssistantSettingsForm } from '@/cms/settings/assistant-settings-form'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'
import { isPlatformAdmin } from '@/site/access'

export default async function AssistantSettingsPage({ params }: { params: Promise<{ site: string }> }) {
  const [{ payload, user, site }, t] = await Promise.all([requireSite((await params).site), getTranslator()])
  const { docs: [settings] } = await payload.find({
    collection: 'assistant-settings', depth: 0, limit: 1, overrideAccess: false, user,
    where: { tenant: { equals: site.id } },
  })
  const editable = isPlatformAdmin(user)
  return (
    <>
      <SiteHeader
        crumbs={[
          { label: site.name, href: `/admin/${site.id}` },
          { label: t('websiteSettings'), href: `/admin/${site.id}/settings` },
          { label: t('assistant') },
        ]}
      />
      <SettingsFrame site={site.id}>
        <PageTitle title={t('assistant')} description={t('assistantSettingsDescription')} />
        {!editable && (
          <Alert>
            <AlertDescription>{t('platformOnlySettings')}</AlertDescription>
          </Alert>
        )}
        <AssistantSettingsForm
          site={site.id}
          editable={editable}
          settings={settings ? { id: settings.id, provider: settings.provider, baseURL: settings.baseURL ?? '', models: settings.models ?? [] } : undefined}
        />
      </SettingsFrame>
    </>
  )
}

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
          { label: t('aiSettings') },
        ]}
      />
      <SettingsFrame site={site.id}>
        <PageTitle title={t('aiSettings')} description={t('assistantSettingsDescription')} />
        <AssistantSettingsForm
          site={site.id}
          editable={editable}
          settings={
            settings
              ? {
                  id: settings.id,
                  defaultModel: settings.defaultModel ?? '',
                  connections: (settings.connections ?? []).map((row) => ({
                    id: row.id ?? '',
                    label: row.label,
                    provider: row.provider,
                    baseURL: row.baseURL ?? '',
                    hasKey: Boolean(row.hasKey),
                    models: row.models ?? [],
                  })),
                }
              : undefined
          }
        />
      </SettingsFrame>
    </>
  )
}

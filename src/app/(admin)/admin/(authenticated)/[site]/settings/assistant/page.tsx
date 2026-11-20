import { adminTranslations } from '@/admin/i18n-server'
import { SettingsWorkspace } from '@/admin/settings-workspace'
import { ShadcnAssistantSettings } from '@/admin/assistant'
import { currentSite } from '@/admin/data'

export default async function AssistantSettingsPage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  const t = await adminTranslations()

  const { selected } = await currentSite((await params).site)
  return (
    <SettingsWorkspace site={selected} title={t('AI-assistent')}>
      <ShadcnAssistantSettings />
    </SettingsWorkspace>
  )
}

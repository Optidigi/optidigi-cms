import { adminTranslations } from '@/admin/i18n-server'
import { SettingsWorkspace } from '@/admin/settings-workspace'
import { ShadcnAssistantSettings } from '@/admin/assistant'
import { currentSite } from '@/admin/data'

export default async function AssistantSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ panel?: string }>
}) {
  const t = await adminTranslations()

  const { selected } = await currentSite((await params).site)
  const value = (await searchParams).panel
  const panel = value === 'models' || value === 'defaults' ? value : 'connection'
  const title = t(
    panel === 'models'
      ? 'Modellen'
      : panel === 'defaults'
        ? 'Assistentvoorkeuren'
        : 'Modelverbinding',
  )
  return (
    <SettingsWorkspace
      site={selected}
      current={panel === 'connection' ? 'assistant' : panel}
      title={title}
    >
      <ShadcnAssistantSettings panel={panel} />
    </SettingsWorkspace>
  )
}

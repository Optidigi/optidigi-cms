import { adminTranslations } from '@/admin/i18n-server'
import { ShadcnAssistantBody } from '@/admin/assistant'
import { PageContainer } from '@/admin/page-container'

export default async function AssistantPage() {
  const t = await adminTranslations()

  return (
    <PageContainer title={t('AI-assistent')}>
      <div className="flex h-[max(36rem,calc(100dvh-12rem))] min-w-0 overflow-hidden rounded-xl border bg-background shadow-xs">
        <ShadcnAssistantBody full />
      </div>
    </PageContainer>
  )
}

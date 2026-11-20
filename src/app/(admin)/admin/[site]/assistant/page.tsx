import { adminTranslations } from '@/admin/i18n-server'
import { ShadcnAssistantBody } from '@/admin/assistant'
import { Card } from '@/components/ui/card'

export default async function AssistantPage() {
  const t = await adminTranslations()

  return (
    <section className="flex w-full flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('AI-assistent')}</h1>
      <Card className="flex h-[max(34rem,calc(100dvh-9rem))] min-w-0 flex-col gap-0 overflow-hidden py-0">
        <ShadcnAssistantBody full />
      </Card>
    </section>
  )
}

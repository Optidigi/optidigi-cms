import { ShadcnAssistantBody } from '@/admin-comparison/assistant'
import { Card } from '@/components/ui/card'

export default function AssistantPage() {
  return (
    <section className="flex w-full flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">AI-assistent</h1>
      <Card className="flex h-[max(34rem,calc(100dvh-9rem))] min-w-0 flex-col gap-0 overflow-hidden py-0">
        <ShadcnAssistantBody full />
      </Card>
    </section>
  )
}

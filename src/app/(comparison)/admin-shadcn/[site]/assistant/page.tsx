import { ShadcnAssistantBody } from '@/admin-comparison/assistant'
import { Card } from '@/components/ui/card'

export default function AssistantPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">AI-assistent</h1>
      <Card className="flex h-[max(30rem,calc(100dvh-10rem))] min-w-0 flex-col gap-0 overflow-hidden py-0">
        <ShadcnAssistantBody />
      </Card>
    </section>
  )
}

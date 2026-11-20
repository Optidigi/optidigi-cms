import Link from 'next/link'
import { ShadcnAssistantSettings } from '@/admin-comparison/assistant'
import { adminRoot, currentSite } from '@/admin-comparison/data'

export default async function AssistantSettingsPage({
  params,
}: {
  params: Promise<{ site: string }>
}) {
  const { selected } = await currentSite((await params).site)
  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <header>
        <Link
          href={adminRoot + '/' + selected.id + '/settings'}
          className="text-sm text-muted-foreground hover:underline"
        >
          Instellingen
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Modelverbinding</h1>
      </header>
      <ShadcnAssistantSettings />
    </section>
  )
}

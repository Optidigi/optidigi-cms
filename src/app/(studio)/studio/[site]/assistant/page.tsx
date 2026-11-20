import { notFound } from 'next/navigation'
import { assistantMemberships } from '@/assistant/scope-shared'
import { StudioChat } from '@/studio/chat'
import { listSites, studioRequest } from '@/studio/data'
import { StudioShell } from '@/studio/shell'
import { Alert, AlertDescription } from '@/studio/ui/alert'

export default async function AssistantPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  const req = await studioRequest()
  const sites = await listSites(req)
  const active = sites.find(({ id }) => String(id) === site)
  if (!active) notFound()
  const membership = assistantMemberships(req.user).find(({ id }) => id === active.id)

  return (
    <StudioShell sites={sites} active={active.id}>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-5 text-3xl font-semibold tracking-tight">AI-assistent</h1>
        {membership ? (
          <StudioChat site={active.id} canManage={membership.canManage} />
        ) : (
          <Alert>
            <AlertDescription>Voeg je account eerst toe aan het website-team.</AlertDescription>
          </Alert>
        )}
      </div>
    </StudioShell>
  )
}

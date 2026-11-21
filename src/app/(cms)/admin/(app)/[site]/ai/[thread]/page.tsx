import { notFound } from 'next/navigation'
import { AssistantPage } from '@/cms/assistant/assistant-page'
import { getTranslator, requireSite } from '@/cms/server'
import { SiteHeader } from '@/cms/shell/site-header'
import { relationID } from '@/site/access'

export default async function AssistantThreadRoute({ params }: { params: Promise<{ site: string; thread: string }> }) {
  const { site: siteParam, thread: threadParam } = await params
  const thread = relationID(threadParam)
  if (!thread) notFound()
  const [{ site }, t] = await Promise.all([requireSite(siteParam), getTranslator()])
  return (
    <div className="flex h-[calc(100svh-var(--inset-gap)*2)] flex-col">
      <SiteHeader crumbs={[{ label: site.name, href: `/admin/${site.id}` }, { label: t('assistant'), href: `/admin/${site.id}/ai` }]} />
      <AssistantPage thread={thread} />
    </div>
  )
}

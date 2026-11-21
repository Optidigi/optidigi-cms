import { AssistantPage } from '@/cms/assistant/assistant-page'
import { getTranslator, requireSite } from '@/cms/server'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function AssistantRoute({ params }: { params: Promise<{ site: string }> }) {
  const [{ site }, t] = await Promise.all([requireSite((await params).site), getTranslator()])
  return (
    <div className="flex h-[calc(100svh-var(--inset-gap)*2)] flex-col">
      <SiteHeader crumbs={[{ label: site.name, href: `/admin/${site.id}` }, { label: t('assistant') }]} />
      <AssistantPage />
    </div>
  )
}

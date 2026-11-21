import { notFound } from 'next/navigation'
import { getTranslator, requirePlatformAdmin } from '@/cms/server'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { WebsiteForm } from '@/cms/settings/website-form'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'
import { relationID } from '@/site/access'

export default async function WebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const [{ payload, user }, t] = await Promise.all([requirePlatformAdmin(), getTranslator()])
  const id = idParam === 'new' ? undefined : relationID(idParam)
  if (idParam !== 'new' && !id) notFound()
  const tenant = id
    ? await payload.findByID({ collection: 'tenants', id, depth: 0, overrideAccess: false, user, disableErrors: true })
    : undefined
  if (id && !tenant) notFound()
  const title = tenant?.name ?? t('newWebsite')
  return (
    <>
      <SiteHeader crumbs={[{ label: t('platform') }, { label: t('websites'), href: '/admin/platform/websites' }, { label: title }]} />
      <SettingsFrame>
        <PageTitle title={title} />
        <WebsiteForm website={tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, siteOrigin: tenant.siteOrigin } : undefined} />
      </SettingsFrame>
    </>
  )
}

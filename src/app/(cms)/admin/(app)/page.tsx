import { redirect } from 'next/navigation'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { getPreferences, getSites, getTranslator } from '@/cms/server'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function AdminHome() {
  const [sites, preferences, t] = await Promise.all([getSites(), getPreferences(), getTranslator()])
  const site = sites.find(({ id }) => id === preferences.site) ?? sites[0]
  if (site) redirect(`/admin/${site.id}`)
  return (
    <>
      <SiteHeader crumbs={[{ label: t('websites') }]} />
      <Empty className="m-4 border md:m-6">
        <EmptyHeader>
          <EmptyTitle>{t('noWebsites')}</EmptyTitle>
          <EmptyDescription>{t('noWebsitesDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}

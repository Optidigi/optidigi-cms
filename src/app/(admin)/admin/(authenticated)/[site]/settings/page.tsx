import { redirect } from 'next/navigation'
import { currentSite } from '@/admin/data'
import { siteHref } from '@/admin/navigation'

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const [{ selected }, query] = await Promise.all([
    params.then(({ site }) => currentSite(site)),
    searchParams,
  ])
  redirect(siteHref(selected.id, '/site-settings', query.locale === 'en' ? 'en' : 'nl'))
}

import { SiteSettingsPage } from '@/cms/settings/site-settings-page'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  return <SiteSettingsPage site={(await params).site} locale={(await searchParams).locale} part="seo" />
}

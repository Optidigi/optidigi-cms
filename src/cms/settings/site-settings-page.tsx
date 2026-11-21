import { getTranslator, requireSite } from '../server'
import { contentLocale } from '../sections'
import { SiteHeader } from '../shell/site-header'
import { PageTitle } from '../shell/page'
import { SettingsFrame } from './settings-layout'
import { SiteSettingsForm, type SettingsPart } from './site-settings-form'

const titles = {
  general: ['general', 'generalDescription'],
  navigation: ['navigation', 'navigationDescription'],
  seo: ['seo', 'seoDescriptionSettings'],
} as const

export async function SiteSettingsPage({ site: siteParam, locale: localeParam, part }: { site: string; locale?: string; part: SettingsPart }) {
  const [{ payload, user, site }, t] = await Promise.all([requireSite(siteParam), getTranslator()])
  const locale = contentLocale(localeParam)
  const { docs: [doc] } = await payload.find({
    collection: 'site-settings',
    depth: 0,
    draft: true,
    fallbackLocale: false,
    limit: 1,
    locale,
    overrideAccess: false,
    user,
    where: { tenant: { equals: site.id } },
  })
  const [title, description] = titles[part]
  return (
    <>
      <SiteHeader
        crumbs={[
          { label: site.name, href: `/admin/${site.id}` },
          { label: t('websiteSettings'), href: `/admin/${site.id}/settings` },
          { label: t(title) },
        ]}
      />
      <SettingsFrame site={site.id}>
        <PageTitle title={t(title)} description={t(description)} />
        <SiteSettingsForm
          key={`${doc?.id ?? 'new'}-${locale}-${doc?.updatedAt ?? ''}`}
          site={site.id}
          part={part}
          locale={locale}
          document={
            doc
              ? {
                  id: doc.id,
                  status: doc._status ?? 'draft',
                  name: doc.name ?? '',
                  contactEmail: doc.contactEmail ?? '',
                  phone: doc.phone ?? '',
                  navigation: (doc.navigation ?? []).map(({ label, href }) => ({ label, href })),
                  seo: { title: doc.seo?.title ?? '', description: doc.seo?.description ?? '' },
                }
              : undefined
          }
          siteName={site.name}
        />
      </SettingsFrame>
    </>
  )
}

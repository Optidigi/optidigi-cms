import { getTranslator, requireSite } from '../server'
import { contentLocale } from '../sections'
import { SiteHeader } from '../shell/site-header'
import { PageTitle } from '../shell/page'
import { SettingsFrame } from './settings-layout'
import { SiteSettingsForm, type PageLink, type SettingsPart } from './site-settings-form'

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
  // Navigation links can point at the website's own pages, using its preview path pattern.
  const pageLinks: PageLink[] = []
  if (part === 'navigation') {
    const [tenant, { docs: pages }] = await Promise.all([
      payload.findByID({ collection: 'tenants', id: site.id, depth: 0, overrideAccess: false, user, select: { previewPaths: true } }),
      payload.find({
        collection: 'pages', depth: 0, draft: true, limit: 200, locale, overrideAccess: false, user, sort: 'title',
        select: { title: true, slug: true }, where: { tenant: { equals: site.id } },
      }),
    ])
    const pattern = tenant.previewPaths?.pages || '/{slug}'
    for (const page of pages) {
      if (page.slug) pageLinks.push({ title: page.title ?? page.slug, href: pattern.replaceAll('{slug}', page.slug) })
    }
  }
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
                  navigation: (doc.navigation ?? []).map(({ id, label, href }) => ({ id, label, href })),
                  seo: { title: doc.seo?.title ?? '', description: doc.seo?.description ?? '' },
                }
              : undefined
          }
          siteName={site.name}
          pageLinks={pageLinks}
        />
      </SettingsFrame>
    </>
  )
}

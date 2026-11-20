import { BriefcaseBusiness, FileText, Images, Newspaper } from 'lucide-react'

export const adminRoot = '/admin'
export const contentLinks = [
  { slug: 'pages', title: 'Pagina’s', Icon: FileText },
  { slug: 'articles', title: 'Artikelen', Icon: Newspaper },
  { slug: 'projects', title: 'Portfolio', Icon: BriefcaseBusiness },
  { slug: 'media', title: 'Media', Icon: Images },
] as const

export function siteHref(site: number, path = '', locale: 'nl' | 'en' = 'nl') {
  return adminRoot + '/' + site + path + (locale === 'en' ? '?locale=en' : '')
}

export function assistantSettingsHref(site: number) {
  return siteHref(site, '/settings/assistant')
}

export function settingsHref(
  path: '/admin/account' | '/admin/account/preferences' | '/admin/platform',
  website?: number,
  locale?: 'nl' | 'en',
  query: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    ...query,
    ...(website && { website: String(website) }),
    ...(locale === 'en' && { locale }),
  })
  return path + (params.size ? '?' + params : '')
}

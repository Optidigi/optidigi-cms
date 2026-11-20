import { BriefcaseBusiness, FileText, Images, Newspaper } from 'lucide-react'

export const comparisonRoot = '/admin-shadcn'
export const contentLinks = [
  { slug: 'pages', title: 'Pagina’s', Icon: FileText },
  { slug: 'articles', title: 'Artikelen', Icon: Newspaper },
  { slug: 'projects', title: 'Portfolio', Icon: BriefcaseBusiness },
  { slug: 'media', title: 'Media', Icon: Images },
] as const

export function siteHref(site: number, path = '', locale: 'nl' | 'en' = 'nl') {
  return comparisonRoot + '/' + site + path + (locale === 'en' ? '?locale=en' : '')
}

export function assistantSettingsHref(site: number) {
  return siteHref(site, '/settings/assistant')
}

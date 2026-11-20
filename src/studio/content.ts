import type { PayloadRequest } from 'payload'
import { isPlatformAdmin, tenantIDs } from '../site/access'

export const sections = {
  pages: 'Websitepagina’s',
  articles: 'Artikelen',
  projects: 'Portfolio',
  media: 'Media',
  'site-settings': 'Website-instellingen',
} as const

export type StudioSection = keyof typeof sections
export type EditorialSection = 'pages' | 'articles' | 'projects'

export function canUseSite(req: PayloadRequest, site: number) {
  return (
    Number.isSafeInteger(site) &&
    site > 0 &&
    (isPlatformAdmin(req.user) || tenantIDs(req.user).includes(site))
  )
}

export function isStudioSection(value: string): value is StudioSection {
  return Object.hasOwn(sections, value)
}

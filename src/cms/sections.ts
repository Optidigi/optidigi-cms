import type { MessageKey } from './i18n'

// URL segment → Payload collection for the editorial collections.
export const sections = {
  pages: { collection: 'pages', label: 'pages', preview: true },
  articles: { collection: 'articles', label: 'articles', preview: false },
  portfolio: { collection: 'projects', label: 'portfolio', preview: false },
} as const satisfies Record<string, { collection: string; label: MessageKey; preview: boolean }>

export type Section = keyof typeof sections
export type EditorialCollection = (typeof sections)[Section]['collection']

export function isSection(value: string): value is Section {
  return Object.hasOwn(sections, value)
}

export const contentLocales = ['nl', 'en'] as const
export type ContentLocale = (typeof contentLocales)[number]

export function contentLocale(value: unknown): ContentLocale {
  return value === 'en' ? 'en' : 'nl'
}

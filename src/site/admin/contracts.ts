export const editorialSections = {
  pages: 'Pagina’s',
  articles: 'Artikelen',
  projects: 'Portfolio',
  'site-settings': 'Website-instellingen',
} as const

export type EditorialSection = keyof typeof editorialSections
export type SaveResult = 'saved' | 'published' | 'restored' | 'deleted' | 'conflict' | 'invalid' | 'failed'

import { isLanguage, type Language } from './i18n'

// Stored in Payload's own payload-preferences collection under this key.
export const preferencesKey = 'cms'

export type Theme = 'system' | 'light' | 'dark'
export type Preferences = { language: Language; theme: Theme; site?: number }

export function readPreferences(value: unknown): Preferences {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const theme = record.theme === 'light' || record.theme === 'dark' ? record.theme : 'system'
  const site = typeof record.site === 'number' && Number.isSafeInteger(record.site) ? record.site : undefined
  return { language: isLanguage(record.language) ? record.language : 'nl', theme, site }
}

import { isLanguage, type Language } from './i18n'

// Stored in Payload's own payload-preferences collection under this key.
export const preferencesKey = 'cms'

export const themes = ['system', 'light', 'dark'] as const
export const accents = ['default', 'blue', 'violet', 'green', 'orange', 'rose'] as const
export const fonts = ['geist', 'inter', 'atkinson', 'system'] as const
export const radii = ['none', 'small', 'default', 'round'] as const

export type Theme = (typeof themes)[number]
export type Accent = (typeof accents)[number]
export type Font = (typeof fonts)[number]
export type Radius = (typeof radii)[number]

// How the CMS looks for one user. Each value maps to shadcn's own theme tokens in admin.css.
export type Appearance = { accent: Accent; font: Font; radius: Radius; reduceMotion: boolean }

export type Preferences = Appearance & { language: Language; theme: Theme; site?: number }

export const defaultAppearance: Appearance = { accent: 'default', font: 'geist', radius: 'default', reduceMotion: false }

const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

export function readPreferences(value: unknown): Preferences {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const site = typeof record.site === 'number' && Number.isSafeInteger(record.site) ? record.site : undefined
  return {
    language: isLanguage(record.language) ? record.language : 'nl',
    theme: pick(themes, record.theme, 'system'),
    accent: pick(accents, record.accent, defaultAppearance.accent),
    font: pick(fonts, record.font, defaultAppearance.font),
    radius: pick(radii, record.radius, defaultAppearance.radius),
    reduceMotion: record.reduceMotion === true,
    site,
  }
}

// The attributes on <html> that admin.css reads; the server sets them so nothing flashes on load.
export function appearanceAttributes(appearance: Appearance) {
  return {
    'data-accent': appearance.accent,
    'data-font': appearance.font,
    'data-radius': appearance.radius,
    'data-reduce-motion': appearance.reduceMotion ? 'true' : undefined,
  }
}

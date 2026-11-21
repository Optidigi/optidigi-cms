'use client'

import { createContext, useContext, useMemo } from 'react'
import { translator, type Language, type Translate } from '../i18n'

const I18nContext = createContext<{ language: Language; t: Translate } | null>(null)

export function I18nProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  const value = useMemo(() => ({ language, t: translator(language) }), [language])
  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}

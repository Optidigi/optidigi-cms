'use client'

import { createContext, useContext } from 'react'
import type { Preferences } from '../preferences'

const PreferencesContext = createContext<Preferences>({ language: 'nl', theme: 'system' })

export function PreferencesProvider({ value, children }: { value: Preferences; children: React.ReactNode }) {
  return <PreferencesContext value={value}>{children}</PreferencesContext>
}

export function usePreferences() {
  return useContext(PreferencesContext)
}

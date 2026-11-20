'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { translate, type InterfaceLanguage } from './i18n'

type EditGuard = { markDirty: (dirty: boolean) => void; canNavigate: (message: string) => boolean }
const GuardContext = createContext<EditGuard>({ markDirty() {}, canNavigate: () => true })

export function useEditingGuard() {
  return useContext(GuardContext)
}

const LanguageContext = createContext<InterfaceLanguage>('nl')

export function InterfaceLanguageProvider({
  language,
  children,
}: {
  language: InterfaceLanguage
  children: ReactNode
}) {
  const dirty = useRef(false)
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty.current) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])
  const guard = useMemo<EditGuard>(
    () => ({
      markDirty(value) {
        dirty.current = value
      },
      canNavigate(message) {
        return !dirty.current || window.confirm(message)
      },
    }),
    [],
  )
  return (
    <LanguageContext.Provider value={language}>
      <GuardContext.Provider value={guard}>{children}</GuardContext.Provider>
    </LanguageContext.Provider>
  )
}

export function useInterfaceLanguage() {
  return useContext(LanguageContext)
}

export function useAdminTranslations() {
  const language = useInterfaceLanguage()
  return useCallback((text: string) => translate(language, text), [language])
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { translate, type InterfaceLanguage } from './i18n'

type EditGuard = {
  markDirty: (dirty: boolean, scope?: string) => void
  hasChanges: () => boolean
  navigate: (action: () => void) => void
}
const GuardContext = createContext<EditGuard>({
  markDirty() {},
  hasChanges: () => false,
  navigate: (action) => action(),
})

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
  const dirty = useRef(new Set<string>())
  const [pending, setPending] = useState<(() => void) | null>(null)
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty.current.size) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])
  const guard = useMemo<EditGuard>(
    () => ({
      markDirty(value, scope = 'editor') {
        if (value) dirty.current.add(scope)
        else dirty.current.delete(scope)
      },
      hasChanges: () => dirty.current.size > 0,
      navigate(action) {
        if (dirty.current.size) setPending(() => action)
        else action()
      },
    }),
    [],
  )
  return (
    <LanguageContext.Provider value={language}>
      <GuardContext.Provider value={guard}>
        {children}
        <AlertDialog
          open={pending !== null}
          onOpenChange={(open) => {
            if (!open) setPending(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {translate(language, 'Niet-opgeslagen wijzigingen verlaten?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {translate(
                  language,
                  'Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?',
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{translate(language, 'Annuleren')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  dirty.current.clear()
                  setPending(null)
                  pending?.()
                }}
              >
                {translate(language, 'Wijzigingen verwerpen')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GuardContext.Provider>
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

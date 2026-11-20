'use client'

import { Button, useAuth, useTranslation } from '@payloadcms/ui'

export function NativeInterfaceLanguage() {
  const { user } = useAuth()
  const { i18n, switchLanguage } = useTranslation()
  if (!user || !switchLanguage) return null
  const english = i18n.language === 'en'
  return (
    <Button
      buttonStyle="secondary"
      margin={false}
      aria-label={
        english
          ? 'Interface language: English. Switch to Dutch'
          : 'Interfacetaal: Nederlands. Schakel naar Engels'
      }
      onClick={() => void switchLanguage(english ? 'nl' : 'en')}
    >
      {english ? 'Interface EN' : 'Interface NL'}
    </Button>
  )
}

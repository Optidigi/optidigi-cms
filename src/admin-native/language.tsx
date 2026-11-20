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
        english ? 'Language: English. Switch to Dutch' : 'Taal: Nederlands. Schakel naar Engels'
      }
      onClick={() => void switchLanguage(english ? 'nl' : 'en')}
    >
      {english ? 'Language EN' : 'Taal NL'}
    </Button>
  )
}

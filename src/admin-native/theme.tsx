'use client'

import { useTranslation } from '@payloadcms/ui'
import { useLayoutEffect, type ReactNode } from 'react'
import './native.css'

export function NativeAdminTheme({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem('optidigi:admin-appearance') === 'tweaked') {
        document.documentElement.dataset.adminAppearance = 'tweaked'
      }
    } catch {}
    return () => {
      delete document.documentElement.dataset.adminAppearance
    }
  }, [])

  return children
}

export function NativeThemeLoginIntro() {
  const { i18n } = useTranslation()
  const english = i18n.language === 'en'

  return (
    <div className="native-theme-login-intro">
      <h1>{english ? 'Sign in to Optidigi' : 'Inloggen bij Optidigi'}</h1>
      <p>{english ? 'Use your existing CMS account.' : 'Gebruik je bestaande CMS-account.'}</p>
    </div>
  )
}

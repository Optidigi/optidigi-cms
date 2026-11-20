'use client'

import { Link, useAuth, useConfig, usePathname, useTranslation } from '@payloadcms/ui'
import { Settings2 } from 'lucide-react'

export function NativeSettingsLink() {
  const { user } = useAuth()
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const pathname = usePathname()
  const href = `${config.routes.admin}/settings`

  if (!user) return null

  return (
    <Link
      href={href}
      className="native-settings__nav-link"
      aria-current={pathname === href ? 'page' : undefined}
    >
      <Settings2 size={14} aria-hidden="true" />
      {i18n.language === 'en' ? 'Settings' : 'Instellingen'}
    </Link>
  )
}

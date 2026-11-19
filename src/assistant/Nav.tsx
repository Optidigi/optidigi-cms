'use client'

import { Link, useConfig, usePathname, useTranslation } from '@payloadcms/ui'
import { adminLabels } from '../admin-workspace/i18n'

export function AssistantNav() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const pathname = usePathname()
  const href = config.routes.admin + '/assistant'
  const current = pathname === href
  return (
    <Link
      id="nav-optidigi-assistant"
      className={current ? 'nav__link nav__link--selected' : 'nav__link'}
      href={href}
      aria-current={current ? 'page' : undefined}
    >
      <span className="nav__link-label">
        {adminLabels(i18n.language)('AI assistant', 'AI-assistent')}
      </span>
    </Link>
  )
}

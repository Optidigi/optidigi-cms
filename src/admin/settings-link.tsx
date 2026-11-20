'use client'

import Link from 'next/link'
import { useAdminTranslations, useEditingGuard } from './i18n-context'

export function SettingsLink({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  const t = useAdminTranslations()
  const { canNavigate } = useEditingGuard()
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onNavigate={(event) => {
        if (
          !active &&
          !canNavigate(t('Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?'))
        )
          event.preventDefault()
      }}
      className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
    >
      {label}
    </Link>
  )
}

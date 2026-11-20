'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { useAdminTranslations, useEditingGuard } from './i18n-context'

export function SettingsLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string
  label: string
  active: boolean
  onNavigate?: () => void
}) {
  const t = useAdminTranslations()
  const router = useRouter()
  const { hasChanges, markDirty } = useEditingGuard()
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        onNavigate={(event) => {
          if (!active && hasChanges()) {
            event.preventDefault()
            setConfirm(true)
            return
          }
          onNavigate?.()
        }}
        className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
      >
        {label}
      </Link>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Niet-opgeslagen wijzigingen verlaten?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Annuleren')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                markDirty(false)
                setConfirm(false)
                onNavigate?.()
                router.push(href)
              }}
            >
              {t('Wijzigingen verwerpen')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

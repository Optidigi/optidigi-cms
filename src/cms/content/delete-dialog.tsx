'use client'

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
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '../client/i18n-provider'

export function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title?: string
  description?: string
}) {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t('deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? t('deleteDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              await onConfirm()
              setPending(false)
            }}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

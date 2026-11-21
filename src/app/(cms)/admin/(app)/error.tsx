'use client'

import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { useI18n } from '@/cms/client/i18n-provider'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n()
  return (
    <Empty className="m-4 md:m-6">
      <EmptyHeader>
        <EmptyTitle>{t('errorTitle')}</EmptyTitle>
        <EmptyDescription>{t('errorDescription')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>{t('tryAgain')}</Button>
      </EmptyContent>
    </Empty>
  )
}

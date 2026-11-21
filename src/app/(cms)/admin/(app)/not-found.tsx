import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { getTranslator } from '@/cms/server'

export default async function NotFound() {
  const t = await getTranslator()
  return (
    <Empty className="m-4 md:m-6">
      <EmptyHeader>
        <EmptyTitle>{t('notFoundTitle')}</EmptyTitle>
        <EmptyDescription>{t('notFoundDescription')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/admin" />}>
          {t('overview')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
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
        <Link href="/admin" className={buttonVariants()}>
          {t('overview')}
        </Link>
      </EmptyContent>
    </Empty>
  )
}

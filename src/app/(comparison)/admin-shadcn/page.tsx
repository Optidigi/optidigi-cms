import { comparisonTranslations } from '@/admin-comparison/i18n-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { isPlatformAdmin } from '@/site/access'
import { adminRoot, comparisonRequest, comparisonSites } from '@/admin-comparison/data'

export default async function ShadcnAdminPage() {
  const t = await comparisonTranslations()

  const req = await comparisonRequest()
  const sites = await comparisonSites(req)
  if (sites.length) redirect(adminRoot + '/' + sites[0].id)
  return (
    <Empty className="mx-auto mt-24 max-w-lg">
      <EmptyHeader>
        <EmptyTitle>{t('Geen websites beschikbaar')}</EmptyTitle>
        <EmptyDescription>{t('Vraag je beheerder om toegang tot een website.')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/admin" />}>
          {t('Open Payload')}
        </Button>
        {isPlatformAdmin(req.user) && (
          <Button nativeButton={false} render={<Link href={adminRoot + '/platform'} />}>
            {t('Platformbeheer')}
          </Button>
        )}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={adminRoot + '/account'} />}
        >
          {t('Mijn account')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

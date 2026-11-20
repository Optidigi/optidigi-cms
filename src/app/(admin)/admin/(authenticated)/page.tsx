import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { readPreferences } from '@/admin/preferences'
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
import { adminRoot, adminRequest, adminSites } from '@/admin/data'

export default async function ShadcnAdminPage() {
  const t = await adminTranslations()

  const req = await adminRequest()
  const sites = await adminSites(req)
  const [preferences, jar] = await Promise.all([readPreferences(), cookies()])
  const preferred = preferences?.website ?? Number(jar.get('optidigi-last-website')?.value)
  const site = sites.find(({ id }) => id === preferred) ?? sites[0]
  if (site) redirect(adminRoot + '/' + site.id)
  return (
    <Empty className="mx-auto mt-24 max-w-lg">
      <EmptyHeader>
        <EmptyTitle>{t('Geen websites beschikbaar')}</EmptyTitle>
        <EmptyDescription>{t('Vraag je beheerder om toegang tot een website.')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
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

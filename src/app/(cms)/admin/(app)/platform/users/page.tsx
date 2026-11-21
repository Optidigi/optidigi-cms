import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getTranslator, requirePlatformAdmin } from '@/cms/server'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function UsersPage() {
  const [{ payload, user }, t] = await Promise.all([requirePlatformAdmin(), getTranslator()])
  const { docs } = await payload.find({
    collection: 'users', depth: 0, limit: 500, overrideAccess: false, pagination: false, sort: 'email', user,
  })
  return (
    <>
      <SiteHeader crumbs={[{ label: t('platform') }, { label: t('users') }]} />
      <SettingsFrame>
        <PageTitle
          title={t('users')}
          description={t('usersDescription')}
          actions={
            <Button nativeButton={false} render={<Link href="/admin/platform/users/new" />}>
              <PlusIcon data-icon="inline-start" />
              {t('newUser')}
            </Button>
          }
        />
        <div className="overflow-hidden rounded-md border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>{t('email')}</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">{t('role')}</TableHead>
                <TableHead className="hidden w-28 sm:table-cell">{t('websites')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Link href={`/admin/platform/users/${account.id}`} className="block truncate font-medium hover:underline">
                      {account.email}
                    </Link>
                    <span className="block text-xs text-muted-foreground sm:hidden">
                      {account.role === 'platform-admin' ? t('platformAdmin') : t('customer')} · {account.tenants?.length ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={account.role === 'platform-admin' ? 'default' : 'secondary'}>
                      {account.role === 'platform-admin' ? t('platformAdmin') : t('customer')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{account.tenants?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SettingsFrame>
    </>
  )
}

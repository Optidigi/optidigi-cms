import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getTranslator, requirePlatformAdmin } from '@/cms/server'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'

export default async function WebsitesPage() {
  const [{ payload, user }, t] = await Promise.all([requirePlatformAdmin(), getTranslator()])
  const { docs } = await payload.find({
    collection: 'tenants', depth: 0, limit: 500, overrideAccess: false, pagination: false, sort: 'name', user,
  })
  return (
    <>
      <SiteHeader crumbs={[{ label: t('platform') }, { label: t('websites') }]} />
      <SettingsFrame>
        <PageTitle
          title={t('websites')}
          description={t('websitesDescription')}
          actions={
            <Link href="/admin/platform/websites/new" className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              {t('newWebsite')}
            </Link>
          }
        />
        <div className="overflow-hidden rounded-md border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('websiteUrl')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link href={`/admin/platform/websites/${tenant.id}`} className="block truncate font-medium hover:underline">
                      {tenant.name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground sm:hidden">{tenant.siteOrigin}</span>
                  </TableCell>
                  <TableCell className="hidden truncate text-muted-foreground sm:table-cell">{tenant.siteOrigin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SettingsFrame>
    </>
  )
}

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
  const req = await comparisonRequest()
  const sites = await comparisonSites(req)
  if (sites.length) redirect(adminRoot + '/' + sites[0].id)
  return (
    <Empty className="mx-auto mt-24 max-w-lg">
      <EmptyHeader>
        <EmptyTitle>Geen websites beschikbaar</EmptyTitle>
        <EmptyDescription>Vraag je beheerder om toegang tot een website.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/admin" />}>
          Open Payload
        </Button>
        {isPlatformAdmin(req.user) && (
          <Button nativeButton={false} render={<Link href={adminRoot + '/platform'} />}>
            Platformbeheer
          </Button>
        )}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={adminRoot + '/account'} />}
        >
          Mijn account
        </Button>
      </EmptyContent>
    </Empty>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentSite } from '@/admin/data'
import { adminHTTP } from '@/admin/http'
import { adminTranslations } from '@/admin/i18n-server'
import { SettingsWorkspace } from '@/admin/settings-workspace'
import { siteHref } from '@/admin/navigation'
import { isPlatformAdmin, relationID } from '@/site/access'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function SiteMembers({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { selected, req } = await currentSite((await params).site)
  const t = await adminTranslations()
  const page = Math.min(10000, relationID((await searchParams).page) ?? 1)
  const response = await adminHTTP('cms-admin/site-members?site=' + selected.id + '&page=' + page)
  if (response.status === 403) notFound()
  if (!response.ok) throw new Error('Website membership is unavailable.')
  const { members, nextPage, prevPage } = (await response.json()) as {
    members: { id: number; email: string; role: string }[]
    nextPage?: number
    prevPage?: number
  }
  const href = siteHref(selected.id, '/settings/members')
  return (
    <SettingsWorkspace
      site={selected}
      current="members"
      title={t('Leden en rollen')}
      action={
        isPlatformAdmin(req.user) && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={'/admin/platform?group=users&website=' + selected.id} />}
          >
            {t('Gebruikers beheren')}
          </Button>
        )
      }
    >
      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('E-mailadres')}</TableHead>
              <TableHead>{t('Rol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ id, email, role }) => (
              <TableRow key={id}>
                <TableCell>{email}</TableCell>
                <TableCell>{t(role === 'admin' ? 'Websitebeheerder' : 'Redacteur')}</TableCell>
              </TableRow>
            ))}
            {!members.length && (
              <TableRow>
                <TableCell colSpan={2}>{t('Geen leden gevonden.')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {(prevPage || nextPage) && (
          <div className="flex gap-2 border-t p-3">
            {prevPage && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={href + '?page=' + prevPage} />}
              >
                {t('Vorige')}
              </Button>
            )}
            {nextPage && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={href + '?page=' + nextPage} />}
              >
                {t('Volgende')}
              </Button>
            )}
          </div>
        )}
      </Card>
    </SettingsWorkspace>
  )
}

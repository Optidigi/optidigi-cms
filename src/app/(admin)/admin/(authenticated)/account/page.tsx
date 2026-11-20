import { SettingsWorkspace } from '@/admin/settings-workspace'

import { adminTranslations } from '@/admin/i18n-server'
import { LogOut } from 'lucide-react'
import { AccountForm } from '@/admin/account'
import { adminRequest, adminSites } from '@/admin/data'
import { relationID } from '@/site/access'
import { signOutAdmin } from '@/admin/session'
import { Button } from '@/components/ui/button'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>
}) {
  const t = await adminTranslations()

  const req = await adminRequest()
  const website = relationID((await searchParams).website)
  const sites = await adminSites(req)
  const selected = sites.find(({ id }) => id === website) ?? sites[0]
  return (
    <SettingsWorkspace
      site={selected}
      title={t('Mijn account')}
      action={
        <form action={signOutAdmin}>
          <Button variant="outline" type="submit">
            <LogOut />
            {t('Uitloggen')}
          </Button>
        </form>
      }
    >
      <AccountForm email={req.user?.email ?? ''} />
    </SettingsWorkspace>
  )
}

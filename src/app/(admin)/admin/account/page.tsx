import { GlobalSettingsShell, SettingsWorkspace } from '@/admin/settings-workspace'

import { adminTranslations } from '@/admin/i18n-server'
import { LogOut } from 'lucide-react'
import { AccountForm } from '@/admin/account'
import { adminRequest, adminSites } from '@/admin/data'
import { isPlatformAdmin, relationID } from '@/site/access'
import { signOutAdmin } from '@/admin/session'
import { AppearanceMenu } from '@/admin/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <GlobalSettingsShell sites={sites} selected={selected} platform={isPlatformAdmin(req.user)}>
      <SettingsWorkspace
        site={selected}
        current="personal"
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
        <Card>
          <CardHeader>
            <CardTitle>{t('Voorkeuren')}</CardTitle>
            <CardDescription>{t('Pas de weergave van deze interface aan.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="text-sm font-medium">{t('Kleurmodus')}</span>
            <AppearanceMenu />
          </CardContent>
        </Card>
      </SettingsWorkspace>
    </GlobalSettingsShell>
  )
}

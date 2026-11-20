import { InterfaceLanguageMenu } from '@/admin/language-menu'

import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { AccountForm } from '@/admin/account'
import { adminRoot, adminRequest, adminSites } from '@/admin/data'
import { siteHref } from '@/admin/navigation'
import { relationID } from '@/site/access'
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
  const origin = website ? (await adminSites(req)).find(({ id }) => id === website) : undefined
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:underline"
            href={origin ? siteHref(origin.id, '/settings') : adminRoot}
          >
            {origin ? t('Instellingen · ') + origin.name : t('CMS-overzicht')}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Mijn account')}</h1>
        </div>
        <div className="flex items-center gap-1">
          <InterfaceLanguageMenu />
          <form action={signOutAdmin}>
            <Button variant="outline" type="submit">
              <LogOut />
              {t('Uitloggen')}
            </Button>
          </form>
        </div>
      </header>
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
    </main>
  )
}

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { AccountForm } from '@/admin-comparison/account'
import { adminRoot, comparisonRequest, comparisonSites } from '@/admin-comparison/data'
import { siteHref } from '@/admin-comparison/navigation'
import { relationID } from '@/site/access'
import { signOutComparison } from '@/admin-comparison/session'
import { AppearanceMenu } from '@/admin-comparison/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>
}) {
  const req = await comparisonRequest()
  const website = relationID((await searchParams).website)
  const origin = website ? (await comparisonSites(req)).find(({ id }) => id === website) : undefined
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:underline"
            href={origin ? siteHref(origin.id, '/settings') : adminRoot}
          >
            {origin ? 'Instellingen · ' + origin.name : 'CMS-overzicht'}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Mijn account</h1>
        </div>
        <form action={signOutComparison}>
          <Button variant="outline" type="submit">
            <LogOut /> Uitloggen
          </Button>
        </form>
      </header>
      <AccountForm email={req.user?.email ?? ''} />
      <Card>
        <CardHeader>
          <CardTitle>Voorkeuren</CardTitle>
          <CardDescription>Pas de weergave van deze interface aan.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="text-sm font-medium">Kleurmodus</span>
          <AppearanceMenu />
        </CardContent>
      </Card>
    </main>
  )
}

import { changeStudioPassword } from '@/studio/admin-actions'
import { listSites, studioRequest } from '@/studio/data'
import { StudioShell } from '@/studio/shell'
import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/studio/ui/card'
import { Input } from '@/studio/ui/input'
import { Label } from '@/studio/ui/label'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>
}) {
  const req = await studioRequest()
  const sites = await listSites(req)
  const query = await searchParams
  return (
    <StudioShell sites={sites}>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Mijn account</h1>
        <Card>
          <CardHeader>
            <CardTitle>Wachtwoord wijzigen</CardTitle>
            <CardDescription>{req.user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changeStudioPassword} className="grid gap-4">
              {query.result === 'failed' && (
                <Alert variant="destructive">
                  <AlertDescription>Wachtwoord wijzigen is mislukt.</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Huidig wachtwoord</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Nieuw wachtwoord</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              <Button type="submit">Wachtwoord wijzigen</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  )
}

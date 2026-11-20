import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isPlatformAdmin } from '@/site/access'
import { saveStudioAdministration } from '@/studio/admin-actions'
import { listSites, studioRequest } from '@/studio/data'
import { StudioShell } from '@/studio/shell'
import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/studio/ui/card'
import { Input } from '@/studio/ui/input'
import { Label } from '@/studio/ui/label'
import { NativeSelect, NativeSelectOption } from '@/studio/ui/native-select'

export default async function Administration({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; site?: string; result?: string }>
}) {
  const req = await studioRequest()
  if (!isPlatformAdmin(req.user)) notFound()
  const sites = await listSites(req)
  const query = await searchParams
  const { docs: users } = await req.payload.find({
    collection: 'users',
    req,
    overrideAccess: false,
    depth: 0,
    limit: 100,
    sort: 'email',
    select: { email: true, role: true, tenants: true },
  })
  const selectedSite = sites.find(({ id }) => String(id) === query.site)
  const selectedUser = users.find(({ id }) => String(id) === query.user && id !== req.user?.id)
  const fullSite = selectedSite
    ? await req.payload.findByID({
        collection: 'tenants',
        id: selectedSite.id,
        req,
        overrideAccess: false,
        depth: 0,
      })
    : undefined
  const memberships = new Map(
    (selectedUser?.tenants ?? []).map(({ tenant, role }) => [
      typeof tenant === 'object' ? tenant?.id : tenant,
      role,
    ]),
  )
  return (
    <StudioShell sites={sites}>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Platformbeheer</h1>
        {query.result && (
          <Alert className="mb-5" variant={query.result === 'failed' ? 'destructive' : 'default'}>
            <AlertDescription>
              {query.result === 'failed' ? 'Wijziging mislukt.' : 'Opgeslagen.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Klantwebsites</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {sites.map((site) => (
                  <Button size="sm" variant="outline" key={site.id} asChild>
                    <Link href={'/studio/administration?site=' + site.id}>{site.name}</Link>
                  </Button>
                ))}
              </div>
              <form action={saveStudioAdministration} className="grid gap-3">
                <input type="hidden" name="kind" value="site" />
                <input type="hidden" name="id" value={fullSite?.id ?? ''} />
                <div className="grid gap-2">
                  <Label htmlFor="site-name">Naam</Label>
                  <Input id="site-name" name="name" defaultValue={fullSite?.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site-slug">Code</Label>
                  <Input id="site-slug" name="slug" defaultValue={fullSite?.slug} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site-origin">Website-URL</Label>
                  <Input
                    id="site-origin"
                    name="siteOrigin"
                    type="url"
                    defaultValue={fullSite?.siteOrigin}
                    required
                  />
                </div>
                <Button type="submit">{fullSite ? 'Website opslaan' : 'Website toevoegen'}</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gebruikers en toegang</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {users
                  .filter(({ id }) => id !== req.user?.id)
                  .map((user) => (
                    <Button size="sm" variant="outline" key={user.id} asChild>
                      <Link href={'/studio/administration?user=' + user.id}>{user.email}</Link>
                    </Button>
                  ))}
              </div>
              <form action={saveStudioAdministration} className="grid gap-3">
                <input type="hidden" name="kind" value="user" />
                <input type="hidden" name="id" value={selectedUser?.id ?? ''} />
                <div className="grid gap-2">
                  <Label htmlFor="user-email">E-mailadres</Label>
                  <Input
                    id="user-email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser?.email}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-password">Wachtwoord</Label>
                  <Input
                    id="user-password"
                    name="password"
                    type="password"
                    minLength={12}
                    required={!selectedUser}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Platformrol</Label>
                  <NativeSelect
                    name="role"
                    id="user-role"
                    defaultValue={selectedUser?.role ?? 'customer'}
                  >
                    <NativeSelectOption value="customer">Klant</NativeSelectOption>
                    <NativeSelectOption value="platform-admin">
                      Platformbeheerder
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">Websitetoegang</legend>
                  {sites.map((site) => (
                    <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto]" key={site.id}>
                      <Label htmlFor={'membership-' + site.id}>{site.name}</Label>
                      <NativeSelect
                        id={'membership-' + site.id}
                        name={'membership-' + site.id}
                        defaultValue={memberships.get(site.id) ?? ''}
                      >
                        <NativeSelectOption value="">Geen toegang</NativeSelectOption>
                        <NativeSelectOption value="editor">Redacteur</NativeSelectOption>
                        <NativeSelectOption value="admin">Websitebeheerder</NativeSelectOption>
                      </NativeSelect>
                    </div>
                  ))}
                </fieldset>
                <Button type="submit">
                  {selectedUser ? 'Gebruiker opslaan' : 'Gebruiker toevoegen'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudioShell>
  )
}

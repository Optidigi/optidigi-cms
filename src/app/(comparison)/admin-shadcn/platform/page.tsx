import { InterfaceLanguageMenu } from '@/admin-comparison/language-menu'

import { comparisonTranslations } from '@/admin-comparison/i18n-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminRoot, comparisonRequest, comparisonSites } from '@/admin-comparison/data'
import { savePlatform } from '@/admin-comparison/admin-actions'
import { siteHref } from '@/admin-comparison/navigation'
import { AppearanceMenu } from '@/admin-comparison/theme'
import { isPlatformAdmin, relationID } from '@/site/access'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{
    user?: string
    site?: string
    website?: string
    result?: string
    page?: string
    q?: string
  }>
}) {
  const t = await comparisonTranslations()

  const req = await comparisonRequest()
  if (!isPlatformAdmin(req.user)) notFound()
  const query = await searchParams
  const userID = relationID(query.user)
  const siteID = relationID(query.site)
  const page = relationID(query.page) ?? 1
  const search = typeof query.q === 'string' ? query.q.slice(0, 150).trim() : ''
  const options = { req, overrideAccess: false as const, depth: 0 as const }
  const [sites, users, editUser, editSite] = await Promise.all([
    comparisonSites(req),
    req.payload.find({
      ...options,
      collection: 'users',
      sort: 'email',
      page,
      limit: 20,
      where: search ? { email: { contains: search } } : undefined,
      select: { email: true, role: true },
    }),
    userID
      ? req.payload.findByID({
          ...options,
          collection: 'users',
          id: userID,
          select: { email: true, role: true, tenants: true },
          disableErrors: true,
        })
      : null,
    siteID
      ? req.payload.findByID({
          ...options,
          collection: 'tenants',
          id: siteID,
          select: { name: true, slug: true, siteOrigin: true },
          disableErrors: true,
        })
      : null,
  ])
  if ((userID && (!editUser || editUser.id === req.user?.id)) || (siteID && !editSite)) notFound()
  const root = adminRoot + '/platform'
  const origin = sites.find(({ id }) => id === relationID(query.website))
  const platformHref = (params: Record<string, string>, hash: string) => {
    const scope = new URLSearchParams(params)
    if (origin) scope.set('website', String(origin.id))
    const queryString = scope.toString()
    return root + (queryString ? '?' + queryString : '') + hash
  }
  const membership = new Map(
    editUser?.tenants?.map(({ tenant, role }) => [relationID(tenant), role]),
  )

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={origin ? siteHref(origin.id, '/settings') : adminRoot}
            className="text-sm text-muted-foreground hover:underline"
          >
            {origin ? t('Instellingen · ') + origin.name : t('CMS-overzicht')}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Platformbeheer')}</h1>
        </div>
        <div className="flex items-center gap-1">
          <InterfaceLanguageMenu />
          <AppearanceMenu />
        </div>
      </header>
      {query.result && (
        <Alert variant={query.result === 'saved' ? 'default' : 'destructive'}>
          <AlertDescription>
            {query.result === 'saved'
              ? t('Wijzigingen opgeslagen.')
              : t('Opslaan is niet gelukt. Controleer de invoer.')}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <Card id="websites">
          <CardHeader>
            <CardTitle>{t('Websites')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Naam')}</TableHead>
                  <TableHead>Website</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <Link
                        className="hover:underline"
                        href={platformHref({ site: String(site.id) }, '#websites')}
                      >
                        {site.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-44 truncate">{site.siteOrigin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <form action={savePlatform} className="border-t pt-4">
              <input type="hidden" name="kind" value="site" />
              {origin && <input type="hidden" name="website" value={origin.id} />}
              <input type="hidden" name="id" value={editSite?.id ?? ''} />
              <FieldGroup key={editSite?.id ?? 'new'}>
                <h2 className="text-sm font-semibold">
                  {editSite ? t('Website bewerken') : t('Website toevoegen')}
                </h2>
                <Field>
                  <FieldLabel htmlFor="site-name">{t('Naam')}</FieldLabel>
                  <Input id="site-name" name="name" defaultValue={editSite?.name} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-slug">{t('URL-naam')}</FieldLabel>
                  <Input id="site-slug" name="slug" defaultValue={editSite?.slug} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-origin">{t('Website-URL')}</FieldLabel>
                  <Input
                    id="site-origin"
                    name="siteOrigin"
                    defaultValue={editSite?.siteOrigin}
                    type="url"
                    required
                    placeholder="https://voorbeeld.nl"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit">{t('Website opslaan')}</Button>
                  {editSite && (
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={platformHref({}, '#websites')} />}
                    >
                      {t('Annuleren')}
                    </Button>
                  )}
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <Card id="gebruikers">
          <CardHeader>
            <CardTitle>{t('Gebruikers')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={root} className="flex gap-2">
              {origin && <input type="hidden" name="website" value={origin.id} />}
              <Input
                type="search"
                name="q"
                aria-label={t('Zoek gebruiker')}
                placeholder={t('Zoek op e-mailadres')}
                defaultValue={search}
              />
              <Button type="submit" variant="outline">
                {t('Zoeken')}
              </Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('E-mailadres')}</TableHead>
                  <TableHead>{t('Rol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.docs.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        className="hover:underline"
                        href={
                          user.id === req.user?.id
                            ? adminRoot + '/account' + (origin ? '?website=' + origin.id : '')
                            : platformHref({ user: String(user.id) }, '#gebruikers')
                        }
                      >
                        {user.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.role === 'platform-admin' ? t('Platformbeheerder') : t('Klant')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2">
              {users.hasPrevPage && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={platformHref(
                        { page: String(users.prevPage), q: search },
                        '#gebruikers',
                      )}
                    />
                  }
                >
                  {t('Vorige')}
                </Button>
              )}
              {users.hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={platformHref(
                        { page: String(users.nextPage), q: search },
                        '#gebruikers',
                      )}
                    />
                  }
                >
                  {t('Volgende')}
                </Button>
              )}
            </div>
            <form action={savePlatform} className="border-t pt-4">
              <input type="hidden" name="kind" value="user" />
              {origin && <input type="hidden" name="website" value={origin.id} />}
              <input type="hidden" name="id" value={editUser?.id ?? ''} />
              <FieldGroup key={editUser?.id ?? 'new'}>
                <h2 className="text-sm font-semibold">
                  {editUser ? t('Gebruiker bewerken') : t('Gebruiker toevoegen')}
                </h2>
                <Field>
                  <FieldLabel htmlFor="user-email">{t('E-mailadres')}</FieldLabel>
                  <Input
                    id="user-email"
                    name="email"
                    defaultValue={editUser?.email}
                    required
                    type="email"
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-password">{t('Wachtwoord')}</FieldLabel>
                  <Input
                    id="user-password"
                    name="password"
                    required={!editUser}
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    placeholder={
                      editUser ? t('Leeg laten om te behouden') : t('Ten minste 12 tekens')
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-role">{t('Platformrol')}</FieldLabel>
                  <NativeSelect
                    id="user-role"
                    name="role"
                    defaultValue={editUser?.role ?? 'customer'}
                  >
                    <NativeSelectOption value="customer">{t('Klant')}</NativeSelectOption>
                    <NativeSelectOption value="platform-admin">
                      {t('Platformbeheerder')}
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
                <fieldset className="space-y-3">
                  <legend className="mb-2 text-sm font-medium">
                    {t('Website-lidmaatschappen')}
                  </legend>
                  {sites.map((site) => (
                    <Field key={site.id} orientation="horizontal">
                      <FieldLabel htmlFor={'membership-' + site.id}>{site.name}</FieldLabel>
                      <NativeSelect
                        name={'membership-' + site.id}
                        id={'membership-' + site.id}
                        defaultValue={membership.get(site.id) ?? ''}
                      >
                        <NativeSelectOption value="">{t('Geen toegang')}</NativeSelectOption>
                        <NativeSelectOption value="editor">{t('Redacteur')}</NativeSelectOption>
                        <NativeSelectOption value="admin">
                          {t('Websitebeheerder')}
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  ))}
                </fieldset>
                <div className="flex gap-2">
                  <Button type="submit">{t('Gebruiker opslaan')}</Button>
                  {editUser && (
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={platformHref({}, '#gebruikers')} />}
                    >
                      {t('Annuleren')}
                    </Button>
                  )}
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

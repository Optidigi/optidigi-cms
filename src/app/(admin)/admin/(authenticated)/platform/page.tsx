import { findByID, find } from '@/admin/data'
import { SettingsWorkspace } from '@/admin/settings-workspace'

import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus } from 'lucide-react'
import { adminRoot, adminRequest, adminSites } from '@/admin/data'
import { PlatformForm, PlatformInput } from '@/admin/platform-form'
import { CollectionPagination } from '@/admin/collection-pagination'
import { CollectionToolbar } from '@/admin/collection-toolbar'
import { settingsHref } from '@/admin/navigation'
import { isPlatformAdmin, relationID } from '@/site/access'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
    group?: string
    new?: string
    locale?: string
  }>
}) {
  const t = await adminTranslations()

  const req = await adminRequest()
  if (!isPlatformAdmin(req.user)) notFound()
  const query = await searchParams
  const showUsers = query.group === 'users' || Boolean(query.user)
  const userID = relationID(query.user)
  const siteID = relationID(query.site)
  const page = relationID(query.page) ?? 1
  const search = typeof query.q === 'string' ? query.q.slice(0, 150).trim() : ''
  const editing = Boolean(query.user || query.site || query.new === '1')
  const options = { depth: 0 }
  const [sites, users, editUser, editSite] = await Promise.all([
    adminSites(req),
    find({
      ...options,
      collection: 'users',
      sort: 'email',
      page,
      limit: 20,
      where: search ? { email: { contains: search } } : undefined,
      select: { email: true, role: true },
    }),
    userID
      ? findByID({
          ...options,
          collection: 'users',
          id: userID,
          select: { email: true, role: true, tenants: true },
        })
      : null,
    siteID
      ? findByID({
          ...options,
          collection: 'tenants',
          id: siteID,
          select: { name: true, slug: true, siteOrigin: true },
        })
      : null,
  ])
  if ((userID && (!editUser || editUser.id === req.user?.id)) || (siteID && !editSite)) notFound()
  const root = adminRoot + '/platform'
  const origin = sites.find(({ id }) => id === relationID(query.website))
  const locale = query.locale === 'en' ? 'en' : 'nl'
  const platformHref = (params: Record<string, string>, hash: string) =>
    settingsHref('/admin/platform', origin?.id, locale, {
      ...params,
      ...(showUsers && { group: 'users' }),
    }) + hash
  const membership = new Map(
    editUser?.tenants?.map(({ tenant, role }) => [relationID(tenant), role]),
  )

  return (
    <SettingsWorkspace
      site={origin ?? sites[0]}
      title={t('Platformbeheer')}
      action={
        !editing && (
          <Button nativeButton={false} render={<Link href={platformHref({ new: '1' }, '')} />}>
            <Plus />
            {t(showUsers ? 'Gebruiker toevoegen' : 'Website toevoegen')}
          </Button>
        )
      }
    >
      {query.result && (
        <Alert variant={query.result === 'saved' ? 'default' : 'destructive'}>
          <AlertDescription>
            {query.result === 'saved'
              ? t('Wijzigingen opgeslagen.')
              : t('Opslaan is niet gelukt. Controleer de invoer.')}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 gap-4">
        {!showUsers && (
          <Card id="websites">
            <CardHeader>
              <CardTitle>
                {t(editing ? (editSite ? 'Website bewerken' : 'Website toevoegen') : 'Websites')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editing && (
                <>
                  <CollectionToolbar
                    action={root}
                    website={origin?.id}
                    locale={locale}
                    search={search}
                    placeholder={t('Zoek website')}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('Naam')}</TableHead>
                        <TableHead className="hidden sm:table-cell">Website</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sites
                        .filter(
                          (site) =>
                            !search ||
                            (site.name + site.siteOrigin)
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )
                        .map((site) => (
                          <TableRow key={site.id}>
                            <TableCell>
                              <Link
                                className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] hover:underline"
                                href={platformHref({ site: String(site.id) }, '#websites')}
                              >
                                {site.name}
                              </Link>
                              <span className="block whitespace-normal [overflow-wrap:anywhere] text-xs text-muted-foreground sm:hidden">
                                {site.siteOrigin}
                              </span>
                            </TableCell>
                            <TableCell className="hidden max-w-44 truncate sm:table-cell">
                              {site.siteOrigin}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </>
              )}
              {editing && (
                <PlatformForm>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value="site" />
                  {origin && <input type="hidden" name="website" value={origin.id} />}
                  <input type="hidden" name="id" value={editSite?.id ?? ''} />
                  <FieldGroup key={editSite?.id ?? 'new'}>
                    <Field>
                      <FieldLabel htmlFor="site-name">{t('Naam')}</FieldLabel>
                      <PlatformInput
                        id="site-name"
                        name="name"
                        defaultValue={editSite?.name}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="site-slug">{t('URL-naam')}</FieldLabel>
                      <PlatformInput
                        id="site-slug"
                        name="slug"
                        defaultValue={editSite?.slug}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="site-origin">{t('Website-URL')}</FieldLabel>
                      <PlatformInput
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
                      <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={platformHref({}, '#websites')} />}
                      >
                        {t('Annuleren')}
                      </Button>
                    </div>
                  </FieldGroup>
                </PlatformForm>
              )}
            </CardContent>
          </Card>
        )}
        {showUsers && (
          <Card id="gebruikers">
            <CardHeader>
              <CardTitle>
                {t(
                  editing
                    ? editUser
                      ? 'Gebruiker bewerken'
                      : 'Gebruiker toevoegen'
                    : 'Gebruikers',
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editing && (
                <>
                  <CollectionToolbar
                    action={root}
                    website={origin?.id}
                    locale={locale}
                    search={search}
                    scope="users"
                    placeholder={t('Zoek op e-mailadres')}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('E-mailadres')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('Rol')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.docs.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Link
                              className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] hover:underline"
                              href={
                                user.id === req.user?.id
                                  ? settingsHref('/admin/account', origin?.id, locale)
                                  : platformHref({ user: String(user.id) }, '#gebruikers')
                              }
                            >
                              {user.email}
                            </Link>
                            <Badge variant="secondary" className="mt-1 sm:hidden">
                              {user.role === 'platform-admin' ? t('Platformbeheerder') : t('Klant')}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">
                              {user.role === 'platform-admin' ? t('Platformbeheerder') : t('Klant')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <CollectionPagination
                    previous={
                      users.prevPage
                        ? platformHref({ page: String(users.prevPage), q: search }, '#gebruikers')
                        : undefined
                    }
                    next={
                      users.nextPage
                        ? platformHref({ page: String(users.nextPage), q: search }, '#gebruikers')
                        : undefined
                    }
                  />
                </>
              )}
              {editing && (
                <PlatformForm>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value="user" />
                  {origin && <input type="hidden" name="website" value={origin.id} />}
                  <input type="hidden" name="id" value={editUser?.id ?? ''} />
                  <FieldGroup key={editUser?.id ?? 'new'}>
                    <Field>
                      <FieldLabel htmlFor="user-email">{t('E-mailadres')}</FieldLabel>
                      <PlatformInput
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
                      <PlatformInput
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
                      <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={platformHref({}, '#gebruikers')} />}
                      >
                        {t('Annuleren')}
                      </Button>
                    </div>
                  </FieldGroup>
                </PlatformForm>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsWorkspace>
  )
}

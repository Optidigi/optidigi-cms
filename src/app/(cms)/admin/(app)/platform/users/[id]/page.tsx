import { notFound } from 'next/navigation'
import { getSites, getTranslator, requirePlatformAdmin } from '@/cms/server'
import { SettingsFrame } from '@/cms/settings/settings-layout'
import { UserForm } from '@/cms/settings/user-form'
import { PageTitle } from '@/cms/shell/page'
import { SiteHeader } from '@/cms/shell/site-header'
import { relationID } from '@/site/access'

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const [{ payload, user }, t, sites] = await Promise.all([requirePlatformAdmin(), getTranslator(), getSites()])
  const id = idParam === 'new' ? undefined : relationID(idParam)
  if (idParam !== 'new' && !id) notFound()
  const account = id ? await payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: false, user, disableErrors: true }) : undefined
  if (id && !account) notFound()
  const title = account?.email ?? t('newUser')
  return (
    <>
      <SiteHeader crumbs={[{ label: t('platform') }, { label: t('users'), href: '/admin/platform/users' }, { label: title }]} />
      <SettingsFrame>
        <PageTitle title={title} />
        <UserForm
          sites={sites.map(({ id: siteID, name }) => ({ id: siteID, name }))}
          account={
            account
              ? {
                  id: account.id,
                  email: account.email,
                  role: account.role,
                  memberships: Object.fromEntries(
                    (account.tenants ?? []).flatMap(({ tenant, role }) => {
                      const tenantID = relationID(tenant)
                      return tenantID ? [[tenantID, role]] : []
                    }),
                  ),
                }
              : undefined
          }
        />
      </SettingsFrame>
    </>
  )
}

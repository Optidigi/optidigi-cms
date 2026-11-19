import { Gutter } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import { type AdminViewServerProps, parseCookies } from 'payload'
import { Assistant } from './Assistant'
import { assistantMemberships } from './scope'

export async function AssistantView({
  initPageResult,
  params,
  searchParams,
  server,
  user,
}: AdminViewServerProps) {
  const { permissions, req, visibleEntities } = initPageResult
  const { admin, routes } = req.payload.config
  if (!req.user || !permissions.canAccessAdmin) {
    server.redirect(`${routes.admin}${admin.routes.login}`)
    return null
  }

  const memberships = assistantMemberships(req.user)
  const tenants = memberships.length
    ? await req.payload.find({
        collection: 'tenants',
        depth: 0,
        limit: memberships.length,
        overrideAccess: false,
        req,
        select: { name: true },
        where: { id: { in: memberships.map(({ id }) => id) } },
      })
    : null
  const options = (tenants?.docs ?? []).map(({ id, name }) => ({
    id,
    name,
    canManage: Boolean(memberships.find((membership) => membership.id === id)?.canManage),
  }))
  const selected = Number(parseCookies(req.headers).get('payload-tenant'))

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <Assistant endpoint={`${routes.api}/assistant`} tenants={options} selected={selected} />
      </Gutter>
    </DefaultTemplate>
  )
}

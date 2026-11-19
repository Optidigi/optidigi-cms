import { Gutter, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import type { AdminViewServerProps } from 'payload'
import { adminLabels } from '../admin-workspace/i18n'
import { AssistantSurface } from './Workspace'

export function AssistantView({
  initPageResult,
  params,
  searchParams,
  server,
  user,
  viewActions,
}: AdminViewServerProps) {
  const { permissions, req, visibleEntities } = initPageResult
  const { admin, routes } = req.payload.config
  if (!req.user || !permissions.canAccessAdmin) {
    server.redirect(`${routes.admin}${admin.routes.login}`)
    return null
  }

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
      viewActions={viewActions}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <section className="optidigi-assistant-expanded">
          <SetStepNav
            nav={[{ label: adminLabels(req.i18n.language)('AI assistant', 'AI-assistent') }]}
          />
          <AssistantSurface surface="page" />
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}

export function AssistantSettingsRedirect({ server, initPageResult }: AdminViewServerProps) {
  server.redirect(initPageResult.req.payload.config.routes.admin + '/assistant')
  return null
}

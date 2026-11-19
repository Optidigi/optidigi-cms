import { Gutter } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import type { AdminViewServerProps } from 'payload'
import { AssistantSurface } from './Workspace'

function View(
  { initPageResult, params, searchParams, server, user }: AdminViewServerProps,
  mode: 'chat' | 'settings',
) {
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
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <section className="optidigi-assistant-expanded">
          <h1>{mode === 'settings' ? 'Model settings' : 'Assistant'}</h1>
          <AssistantSurface mode={mode} />
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}

export const AssistantView = (props: AdminViewServerProps) => View(props, 'chat')
export const AssistantSettingsView = (props: AdminViewServerProps) => View(props, 'settings')

import { Gutter, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import type { AdminViewServerProps } from 'payload'
import { AssistantSurface } from './Workspace'

function View(
  { initPageResult, params, searchParams, server, user, viewActions }: AdminViewServerProps,
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
      viewActions={viewActions}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <section className="optidigi-assistant-expanded">
          <SetStepNav
            nav={
              mode === 'settings'
                ? [
                    { label: 'Assistant', url: `${routes.admin}/assistant` },
                    { label: 'Model settings' },
                  ]
                : [{ label: 'Assistant' }]
            }
          />
          <AssistantSurface mode={mode} surface="page" />
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}

export const AssistantView = (props: AdminViewServerProps) => View(props, 'chat')
export const AssistantSettingsView = (props: AdminViewServerProps) => View(props, 'settings')

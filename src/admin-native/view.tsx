import { FormHeader, Gutter, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import type { AdminViewServerProps } from 'payload'
import { NativeAssistantSurface } from './assistant'

export function NativeAssistantView(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams, server, user, viewActions } = props
  const { permissions, req, visibleEntities, locale } = initPageResult
  const { admin, routes } = req.payload.config
  if (!req.user || !permissions.canAccessAdmin) {
    server.redirect(routes.admin + admin.routes.login)
    return null
  }
  const title = req.i18n.language === 'en' ? 'AI assistant' : 'AI-assistent'
  return (
    <DefaultTemplate
      {...{ params, searchParams, user, viewActions, permissions, req, visibleEntities, locale }}
      i18n={req.i18n}
      payload={req.payload}
    >
      <Gutter>
        <SetStepNav nav={[{ label: title }]} />
        <section className="native-ai-page">
          <FormHeader heading={title} />
          <NativeAssistantSurface />
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}

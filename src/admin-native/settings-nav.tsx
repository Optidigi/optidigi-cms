'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { Link, useAuth, useTranslation } from '@payloadcms/ui'
import { relationID } from '@/site/access'
import { useTweakedAppearance } from './theme'

export function TweakedAssistantLink() {
  return useTweakedAppearance() ? <AssistantShortcut /> : null
}

function AssistantShortcut() {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const { options, selectedTenantID } = useTenantSelection()

  if (!user) return null

  const tenant = relationID(
    selectedTenantID ?? (options.length === 1 ? options[0].value : undefined),
  )
  return (
    <Link href={tenant ? `/admin-shadcn/${tenant}/assistant` : '/admin-shadcn'} forceReload>
      {i18n.language === 'en' ? 'Open AI assistant' : 'Open AI-assistent'}
    </Link>
  )
}

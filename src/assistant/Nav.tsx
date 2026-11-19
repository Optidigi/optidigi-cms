'use client'

import { Link, useConfig } from '@payloadcms/ui'

export function AssistantNav() {
  const { config } = useConfig()
  return (
    <Link className="nav__link" href={`${config.routes.admin}/assistant`}>
      Assistant
    </Link>
  )
}

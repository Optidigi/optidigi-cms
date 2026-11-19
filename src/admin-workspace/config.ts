import type { CollectionConfig, Config } from 'payload'
import { isPlatformAdmin } from '../site/access'

export const workspaceEnabled = process.env.CMS_NATIVE_WORKSPACE !== '0'

export const workspaceDashboard: NonNullable<Config['admin']>['dashboard'] = {
  widgets: [
    {
      slug: 'site-workspace',
      label: 'Website workspace',
      Component: '/admin-workspace/Workspace#SiteWorkspace',
      minWidth: 'full',
      maxWidth: 'full',
    },
  ],
  defaultLayout: [{ widgetSlug: 'site-workspace', width: 'full' }],
}

const navigation = {
  pages: 'Website',
  'site-settings': 'Website',
  articles: 'Content',
  projects: 'Content',
  media: 'Content',
  tenants: 'Platform',
  users: 'Platform',
} as const

export function workspaceNavigation(collection: CollectionConfig): CollectionConfig {
  if (!workspaceEnabled || !(collection.slug in navigation)) return collection
  const group = navigation[collection.slug as keyof typeof navigation]
  return {
    ...collection,
    admin: {
      ...collection.admin,
      group,
      ...(['tenants', 'users'].includes(collection.slug) && {
        hidden: ({ user }) => !isPlatformAdmin(user),
      }),
    },
  }
}

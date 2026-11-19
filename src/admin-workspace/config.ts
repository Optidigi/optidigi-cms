import type { CollectionConfig, Config } from 'payload'
import { isPlatformAdmin } from '../site/access'
import { collectionLabels } from './i18n'

export const workspaceEnabled = process.env.CMS_NATIVE_WORKSPACE !== '0'

export const workspaceDashboard: NonNullable<Config['admin']>['dashboard'] = {
  widgets: [
    {
      slug: 'site-workspace',
      label: { en: 'Website workspace', nl: 'Websitebeheer' },
      Component: '/admin-workspace/Workspace#SiteWorkspace',
      minWidth: 'full',
      maxWidth: 'full',
    },
  ],
  defaultLayout: [{ widgetSlug: 'site-workspace', width: 'full' }],
}

const website = { en: 'Website', nl: 'Website' }
const content = { en: 'Publishing', nl: 'Publicaties' }
const platform = { en: 'Administration', nl: 'Beheer' }
const navigation = {
  pages: website,
  'site-settings': website,
  articles: content,
  projects: content,
  media: content,
  tenants: platform,
  users: platform,
} as const

export function workspaceNavigation(collection: CollectionConfig): CollectionConfig {
  if (!(collection.slug in navigation)) return collection
  const slug = collection.slug as keyof typeof navigation
  return {
    ...collection,
    labels: collectionLabels[slug],
    admin: {
      ...collection.admin,
      ...(workspaceEnabled && { group: navigation[slug] }),
      ...((slug === 'tenants' || slug === 'users') && {
        hidden: ({ user }) => !isPlatformAdmin(user),
      }),
    },
  }
}

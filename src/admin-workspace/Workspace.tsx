import { Button, Link } from '@payloadcms/ui'
import type { WidgetServerProps } from 'payload'
import { loadWorkspace } from './data'
import './workspace.css'

const draftTypes = { pages: 'Page', articles: 'Article', projects: 'Project' }

export async function SiteWorkspace({ req, cookies }: WidgetServerProps) {
  if (!req.user) return null

  const admin = req.payload.config.routes.admin
  const site = await loadWorkspace(req, cookies.get('payload-tenant'))
  if (!site) {
    return (
      <section className="optidigi-workspace">
        <div className="optidigi-workspace__hero">
          <h2>Website workspace</h2>
          <p>Choose a site in the tenant picker to see its content and drafts.</p>
        </div>
      </section>
    )
  }

  const { tenant, homepageID, settingsID, drafts } = site
  const route = (collection: string, id?: number) =>
    `${admin}/collections/${collection}${id === undefined ? '' : '/' + id}`
  const date = new Intl.DateTimeFormat(req.i18n.language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

  return (
    <section className="optidigi-workspace" aria-label={`${tenant.name} workspace`}>
      <div className="optidigi-workspace__hero">
        <div>
          <h2>{tenant.name}</h2>
          <a href={tenant.siteOrigin} target="_blank" rel="noreferrer">
            {new URL(tenant.siteOrigin).host} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="optidigi-workspace__actions">
          <Button el="link" to={route('pages', homepageID)} margin={false}>
            {homepageID === undefined ? 'Browse pages' : 'Edit homepage'}
          </Button>
          <Button
            el="link"
            to={route('site-settings', settingsID)}
            buttonStyle="secondary"
            margin={false}
          >
            Site settings
          </Button>
        </div>
      </div>
      <nav className="optidigi-workspace__links" aria-label="Website tools">
        {(
          [
            ['Pages', route('pages')],
            ['Articles', route('articles')],
            ['Projects', route('projects')],
            ['Media', route('media')],
            ['Ask AI', `${admin}/assistant`],
          ] as const
        ).map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
      <section className="optidigi-workspace__drafts" aria-label="Recent drafts">
        <h3>Recent drafts</h3>
        {drafts.length ? (
          <ul>
            {drafts.map((draft) => (
              <li key={`${draft.collection}-${draft.id}`}>
                <Link href={route(draft.collection, draft.id)}>
                  <span>
                    <small>{draftTypes[draft.collection]}</small>
                    {draft.title || 'Untitled draft'}
                  </span>
                  <time dateTime={draft.updatedAt}>{date.format(new Date(draft.updatedAt))}</time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No drafts for this site yet.</p>
        )}
      </section>
    </section>
  )
}

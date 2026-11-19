import { Button, Link } from '@payloadcms/ui'
import type { WidgetServerProps } from 'payload'
import { adminLabels, collectionLabels } from './i18n'
import { loadWorkspace } from './data'
import './workspace.css'

export async function SiteWorkspace({ req, cookies }: WidgetServerProps) {
  if (!req.user) return null

  const label = adminLabels(req.i18n.language)
  const locale = req.i18n.language === 'nl' ? 'nl' : 'en'
  const admin = req.payload.config.routes.admin
  const site = await loadWorkspace(req, cookies.get('payload-tenant'))
  if (!site) {
    return (
      <section className="optidigi-workspace">
        <div className="optidigi-workspace__hero">
          <h2>{label('Website workspace', 'Websitebeheer')}</h2>
          <p>
            {label(
              'Choose a website to see its content and drafts.',
              'Kies een website om de inhoud en concepten te bekijken.',
            )}
          </p>
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
            {homepageID === undefined
              ? label('Browse pages', 'Bekijk pagina’s')
              : label('Edit homepage', 'Bewerk homepage')}
          </Button>
          <Button
            el="link"
            to={route('site-settings', settingsID)}
            buttonStyle="secondary"
            margin={false}
          >
            {label('Website settings', 'Website-instellingen')}
          </Button>
        </div>
      </div>
      <nav
        className="optidigi-workspace__links"
        aria-label={label('Website tools', 'Websitefuncties')}
      >
        {(
          [
            [collectionLabels.pages.plural[locale], route('pages')],
            [collectionLabels.articles.plural[locale], route('articles')],
            [collectionLabels.projects.plural[locale], route('projects')],
            [collectionLabels.media.plural[locale], route('media')],
            [label('Ask AI', 'Vraag AI'), `${admin}/assistant`],
          ] as const
        ).map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
      <section
        className="optidigi-workspace__drafts"
        aria-label={label('Recent drafts', 'Recente concepten')}
      >
        <h3>{label('Recent drafts', 'Recente concepten')}</h3>
        {drafts.length ? (
          <ul>
            {drafts.map((draft) => (
              <li key={`${draft.collection}-${draft.id}`}>
                <Link href={route(draft.collection, draft.id)}>
                  <span>
                    <small>{collectionLabels[draft.collection].singular[locale]}</small>
                    {draft.title || label('Untitled draft', 'Concept zonder titel')}
                  </span>
                  <time dateTime={draft.updatedAt}>{date.format(new Date(draft.updatedAt))}</time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{label('No drafts for this site yet.', 'Deze website heeft nog geen concepten.')}</p>
        )}
      </section>
    </section>
  )
}

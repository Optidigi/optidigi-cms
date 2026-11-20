import { Button, FormHeader, Gutter, Link, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'
import type { AdminViewServerProps } from 'payload'
import { assistantMemberships } from '@/assistant/scope-shared'
import { isPlatformAdmin } from '@/site/access'

export function NativeSettingsView(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams, server, user, viewActions } = props
  const { permissions, req, visibleEntities, locale } = initPageResult
  const { admin, routes } = req.payload.config

  if (!req.user || !permissions.canAccessAdmin) {
    server.redirect(routes.admin + admin.routes.login)
    return null
  }

  const copy = (nl: string, en: string) => (req.i18n.language === 'en' ? en : nl)
  const title = copy('Instellingen', 'Settings')
  const canManageModel = assistantMemberships(req.user).some(({ canManage }) => canManage)

  return (
    <DefaultTemplate
      {...{ params, searchParams, user, viewActions, permissions, req, visibleEntities, locale }}
      i18n={req.i18n}
      payload={req.payload}
    >
      <Gutter>
        <SetStepNav nav={[{ label: title }]} />
        <section className="native-settings">
          <FormHeader heading={title} />
          <div className="native-settings__sections">
            {visibleEntities.collections.includes('site-settings') && (
              <section>
                <h2>{copy('Website', 'Website')}</h2>
                <p>
                  {copy(
                    'Beheer je navigatie, SEO en contactgegevens.',
                    'Manage your navigation, SEO, and contact details.',
                  )}
                </p>
                <SettingsButton href={`${routes.admin}/collections/site-settings`}>
                  {copy('Website-instellingen', 'Website settings')}
                </SettingsButton>
              </section>
            )}
            {canManageModel && (
              <section>
                <h2>{copy('AI-assistent', 'AI assistant')}</h2>
                <p>
                  {copy(
                    'Kies een website in de menubalk en beheer de modelverbinding.',
                    'Choose a website in the sidebar to manage its model connection.',
                  )}
                </p>
                <SettingsButton href={`${routes.admin}/assistant?settings=model`}>
                  {copy('Modelverbinding beheren', 'Manage model connection')}
                </SettingsButton>
              </section>
            )}
            <section>
              <h2>{copy('Account', 'Account')}</h2>
              <p>
                {copy(
                  'Beheer je e-mailadres, wachtwoord en voorkeuren.',
                  'Manage your email, password, and preferences.',
                )}
              </p>
              <SettingsButton href={routes.admin + admin.routes.account}>
                {copy('Mijn account', 'My account')}
              </SettingsButton>
            </section>
            {isPlatformAdmin(req.user) && (
              <section>
                <h2>{copy('Platformbeheer', 'Platform administration')}</h2>
                <p>
                  {copy(
                    'Beheer klantwebsites, gebruikers en hun toegang.',
                    'Manage customer websites, users, and their access.',
                  )}
                </p>
                <div className="native-settings__actions">
                  <SettingsButton href={`${routes.admin}/collections/tenants`}>
                    {copy('Klantwebsites', 'Customer websites')}
                  </SettingsButton>
                  <SettingsButton href={`${routes.admin}/collections/users`}>
                    {copy('Gebruikers', 'Users')}
                  </SettingsButton>
                </div>
              </section>
            )}
          </div>
          <div className="native-settings__appearance">
            <Link
              className="native-settings__themed"
              href="/admin-tweaked"
              target="_blank"
              rel="noopener"
            >
              {copy('Open het thema in een nieuw tabblad', 'Open the themed admin in a new tab')}
            </Link>
            <Link
              className="native-settings__stock"
              href="/admin-tweaked?style=default"
              forceReload
            >
              {copy('Terug naar de standaardweergave', 'Return to the default appearance')}
            </Link>
          </div>
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}

function SettingsButton({ href, children }: { href: string; children: string }) {
  return (
    <Button el="link" to={href} buttonStyle="secondary" margin={false}>
      {children}
    </Button>
  )
}

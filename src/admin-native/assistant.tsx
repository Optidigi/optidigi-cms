'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import {
  Banner,
  Button,
  Link,
  useAuth,
  useConfig,
  useLocale,
  usePathname,
  useSearchParams,
} from '@payloadcms/ui'
import { ArrowUp, ExternalLink, Settings2, Sparkles, Square, X } from 'lucide-react'
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { contextCollections, type ModelProvider, type ResponseDetail } from '@/assistant/protocol'
import { assistantMemberships } from '@/assistant/scope-shared'
import {
  useAssistant,
  type AssistantContext,
  type AssistantController,
  type AssistantTenant,
} from '@/assistant/use-assistant'
import './native.css'

function useNativeContext() {
  const { user } = useAuth()
  const { config } = useConfig()
  const { selectedTenantID, options } = useTenantSelection()
  const payloadLocale = useLocale()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const localeParam = searchParams.get('locale')
  const locale: 'nl' | 'en' =
    localeParam === 'en' || localeParam === 'nl'
      ? localeParam
      : payloadLocale?.code === 'en'
        ? 'en'
        : 'nl'
  const memberships = assistantMemberships(user)
  const active =
    memberships.find(({ id }) => id === Number(selectedTenantID)) ??
    (memberships.length === 1 ? memberships[0] : undefined)
  const root = config.routes.admin
  const route = root + '/assistant'
  const pathDocument = pathname
    ?.slice(root.length)
    .match(/^\/collections\/(pages|articles|projects|site-settings)\/(\d+)\/?$/)
  const collection =
    pathDocument?.[1] ?? (pathname === route ? searchParams.get('collection') : null)
  const documentId = Number(
    pathDocument?.[2] ?? (pathname === route ? searchParams.get('document') : null),
  )
  const type = contextCollections.find((candidate) => candidate === collection)
  const document =
    type && Number.isSafeInteger(documentId) && documentId > 0
      ? { collection: type, id: documentId }
      : undefined
  return {
    user,
    tenant: active && {
      ...active,
      name: String(options.find(({ value }) => Number(value) === active.id)?.label ?? 'Website'),
    },
    endpoint: config.routes.api + '/assistant',
    root,
    route,
    expandedRoute: document
      ? route +
        '?' +
        new URLSearchParams({
          collection: document.collection,
          document: String(document.id),
          locale,
        })
      : route,
    pathname,
    locale,
    document,
    openModelSettings: pathname === route && searchParams.get('settings') === 'model',
    hasMemberships: memberships.length > 0,
  }
}

type NativeSession = { scope: string; chat: AssistantController }
const NativeAssistantContext = createContext<NativeSession | undefined>(undefined)

// Key the assistant controller independently so a tenant change leaves Payload's editor tree mounted.
export function NativeAssistantProvider({ children }: { children: ReactNode }) {
  const { user, tenant, endpoint, document, locale } = useNativeContext()
  const scope = user && tenant ? String(user.id) + ':' + tenant.id : undefined
  const [session, setSession] = useState<NativeSession>()
  const [previousScope, setPreviousScope] = useState(scope)
  if (scope !== previousScope) {
    setPreviousScope(scope)
    setSession(undefined)
  }
  return (
    <NativeAssistantContext.Provider value={session?.scope === scope ? session : undefined}>
      {scope && tenant && (
        <NativeAssistantSession
          key={scope}
          scope={scope}
          tenantId={tenant.id}
          tenantName={tenant.name}
          canManage={tenant.canManage}
          endpoint={endpoint}
          collection={document?.collection}
          documentId={document?.id}
          locale={locale}
          publish={setSession}
        />
      )}
      {children}
    </NativeAssistantContext.Provider>
  )
}

const NativeAssistantSession = memo(function NativeAssistantSession({
  scope,
  tenantId,
  tenantName,
  canManage,
  endpoint,
  collection,
  documentId,
  locale,
  publish,
}: {
  scope: string
  tenantId: number
  tenantName: string
  canManage: boolean
  endpoint: string
  collection?: AssistantContext['collection']
  documentId?: number
  locale: 'nl' | 'en'
  publish: (session: NativeSession) => void
}) {
  const chat = useAssistant({
    tenant: { id: tenantId, name: tenantName, canManage },
    endpoint,
    document: collection && documentId ? { collection, id: documentId } : undefined,
    locale,
  })
  useLayoutEffect(() => {
    publish({ scope, chat })
  }, [chat, publish, scope])
  return null
})

export function NativeAssistantLink() {
  const { user, route } = useNativeContext()
  return user ? (
    <Link className="native-ai-nav-link" href={route}>
      <Sparkles size={14} /> AI-assistent
    </Link>
  ) : null
}

export function NativeAssistantAction() {
  const { user, route, expandedRoute, pathname } = useNativeContext()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const showing = open && pathname !== route && Boolean(user)

  useEffect(() => {
    const panel = dialog.current
    if (!showing || !panel) return
    panel.showModal()
    return () => {
      panel.close()
    }
  }, [showing])

  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus())
  }

  if (!user || pathname === route) return null
  return (
    <div ref={trigger}>
      <Button
        margin={false}
        size="medium"
        buttonStyle="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="native-ai-button">
          <Sparkles size={15} /> Vraag AI
        </span>
      </Button>
      {showing && (
        <dialog
          ref={dialog}
          className="native-ai-drawer"
          aria-labelledby="native-ai-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <header className="native-ai-drawer-header">
            <strong id="native-ai-title">
              <Sparkles size={16} /> AI-assistent
            </strong>
            <div>
              <Link
                href={expandedRoute}
                className="native-ai-icon"
                aria-label="Open assistentpagina"
                title="Open assistentpagina"
                onClick={close}
              >
                <ExternalLink size={16} />
              </Link>
              <button
                type="button"
                className="native-ai-icon"
                aria-label="Assistent sluiten"
                onClick={close}
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <NativeAssistantSurface />
        </dialog>
      )}
    </div>
  )
}

export function NativeAssistantSurface() {
  const { tenant, document, root, openModelSettings, hasMemberships } = useNativeContext()
  const session = useContext(NativeAssistantContext)
  if (!tenant)
    return (
      <div className="native-ai-empty">
        <Banner>
          {hasMemberships
            ? 'Selecteer een website om de assistent te gebruiken.'
            : 'Je account heeft nog geen toegang tot een website.'}
        </Banner>
      </div>
    )
  if (!session)
    return (
      <p className="native-ai-status" role="status">
        Assistent laden…
      </p>
    )
  return (
    <NativeChat
      key={session.scope + (openModelSettings ? ':settings' : '')}
      tenant={tenant}
      attached={Boolean(document)}
      root={root}
      openModelSettings={openModelSettings}
      chat={session.chat}
    />
  )
}

function NativeChat({
  tenant,
  attached,
  root,
  openModelSettings,
  chat,
}: {
  tenant: AssistantTenant
  attached: boolean
  root: string
  openModelSettings: boolean
  chat: AssistantController
}) {
  const [settings, setSettings] = useState(openModelSettings && tenant.canManage)
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const active = chat.busy === 'chat'
  const configured = chat.model?.connected
  const connection = chat.model?.settings

  useEffect(() => {
    if (atBottom.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight
  }, [chat.turns])

  return (
    <div className="native-ai-chat">
      <div className="native-ai-meta">
        <span>
          {tenant.name}
          {attached ? ' · Huidig document' : ''}
        </span>
        <Button
          margin={false}
          size="medium"
          buttonStyle="secondary"
          disabled={Boolean(chat.busy) || !chat.turns.length}
          onClick={chat.reset}
        >
          Nieuw gesprek
        </Button>
      </div>
      <div
        className="native-ai-thread"
        ref={scroller}
        role="log"
        aria-label="Gesprek"
        onScroll={(event) => {
          const el = event.currentTarget
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {!chat.turns.length && (
          <div className="native-ai-welcome">
            <Sparkles size={25} />
            <h2>Waar kan ik mee helpen?</h2>
            <p>Vraag naar je website of werk samen aan een concept.</p>
          </div>
        )}
        {chat.turns.map(({ id, role, content }) => (
          <div key={id} className={'native-ai-message native-ai-message--' + role}>
            {role === 'assistant' ? (
              <Markdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                {content}
              </Markdown>
            ) : (
              content
            )}
          </div>
        ))}
        {active && (
          <p className="native-ai-status" role="status">
            Assistent antwoordt…
          </p>
        )}
        {chat.result && (
          <div className="native-ai-result">
            <strong>Homepageconcept opgeslagen</strong>
            <div className="native-ai-controls">
              <Link
                href={
                  root + '/collections/pages/' + chat.result.id + '?locale=' + chat.result.locale
                }
              >
                Open concept
              </Link>
              {chat.result.preview && (
                <a href={chat.result.preview} target="_blank" rel="noreferrer">
                  Open voorbeeld
                </a>
              )}
            </div>
          </div>
        )}
        {chat.approval && (
          <div className="native-ai-result">
            <strong>Wil je {chat.approval.label} verwijderen?</strong>
            <div className="native-ai-controls">
              <Button
                size="medium"
                margin={false}
                buttonStyle="secondary"
                disabled={Boolean(chat.busy)}
                onClick={chat.reject}
              >
                Annuleren
              </Button>
              {tenant.canManage && (
                <Button
                  size="medium"
                  margin={false}
                  disabled={Boolean(chat.busy)}
                  onClick={chat.approve}
                >
                  Verwijder bevestigen
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <footer className="native-ai-footer">
        {(chat.error || chat.notice) && (
          <div role={chat.error ? 'alert' : 'status'} className="native-ai-status">
            {chat.error || chat.notice}
          </div>
        )}
        {!chat.model && !chat.error && (
          <p className="native-ai-status" role="status">
            Modelverbinding laden…
          </p>
        )}
        {configured === false && !tenant.canManage && (
          <p className="native-ai-status">Vraag een websitebeheerder om een model te verbinden.</p>
        )}
        {settings && tenant.canManage && chat.model && (
          <NativeModelSettings
            key={connection?.provider}
            {...{ chat }}
            onSaved={() => setSettings(false)}
          />
        )}
        <form
          className="native-ai-composer"
          onSubmit={(event) => {
            event.preventDefault()
            atBottom.current = true
            chat.send()
          }}
        >
          <textarea
            aria-label="Bericht"
            value={chat.input}
            placeholder="Hoe kan ik helpen?"
            maxLength={6000}
            disabled={!configured}
            rows={2}
            onChange={(event) => chat.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <div className="native-ai-controls">
            {tenant.canManage ? (
              <button
                type="button"
                className="native-ai-quiet"
                aria-expanded={settings}
                onClick={() => setSettings(!settings)}
                disabled={Boolean(chat.busy)}
              >
                <Settings2 size={14} /> {chat.model?.model ?? 'Verbind een model'}
              </button>
            ) : (
              chat.model?.model && <span>{chat.model.model}</span>
            )}
            {configured && (
              <select
                aria-label="Antwoordlengte"
                value={chat.detail}
                onChange={(event) => chat.setDetail(event.target.value as ResponseDetail)}
              >
                <option value="brief">Kort</option>
                <option value="standard">Standaard</option>
                <option value="detailed">Uitgebreid</option>
              </select>
            )}
            <div className="native-ai-spacer" />
            <Button
              margin={false}
              size="medium"
              type={active ? 'button' : 'submit'}
              aria-label={active ? 'Stop' : 'Versturen'}
              disabled={
                !active &&
                (!configured || !chat.input.trim() || Boolean(chat.approval) || Boolean(chat.busy))
              }
              onClick={active ? chat.stop : undefined}
            >
              {active ? <Square size={15} /> : <ArrowUp size={16} />}
            </Button>
          </div>
        </form>
      </footer>
    </div>
  )
}

function NativeModelSettings({
  chat,
  onSaved,
}: {
  chat: ReturnType<typeof useAssistant>
  onSaved: () => void
}) {
  const connection = chat.model?.settings
  const [provider, setProvider] = useState<ModelProvider>(connection?.provider ?? 'openai')
  return (
    <form
      className="native-ai-settings"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        void chat.connect(new FormData(form), () => {
          form.reset()
          onSaved()
        })
      }}
    >
      <strong>Modelverbinding</strong>
      <label>
        Provider
        <select
          name="provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as ModelProvider)}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai-compatible">OpenAI-compatible</option>
        </select>
      </label>
      <label>
        Model-ID
        <input name="model" required defaultValue={connection?.model} />
      </label>
      {provider === 'openai-compatible' && (
        <label>
          Provider-URL
          <input name="baseURL" type="url" required defaultValue={connection?.baseURL ?? ''} />
        </label>
      )}
      <label>
        API-sleutel
        <input name="apiKey" type="password" required autoComplete="new-password" />
      </label>
      <div className="native-ai-controls">
        <Button margin={false} size="medium" disabled={Boolean(chat.busy)} type="submit">
          Opslaan
        </Button>
        {chat.model?.connected && (
          <Button
            margin={false}
            size="medium"
            buttonStyle="secondary"
            disabled={Boolean(chat.busy)}
            onClick={() => void chat.disconnect()}
          >
            Loskoppelen
          </Button>
        )}
      </div>
    </form>
  )
}

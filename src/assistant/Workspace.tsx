'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import {
  Banner,
  Button,
  FormHeader,
  Link,
  Pill,
  useAuth,
  useConfig,
  usePathname,
  useTranslation,
} from '@payloadcms/ui'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { adminLabels } from '../admin-workspace/i18n'
import { Assistant } from './Assistant'
import { AssistantIcon } from './Icon'
import { assistantMemberships } from './scope-shared'
import type { AssistantMessage } from './protocol'
import { Conversation } from './conversation'
import './assistant.css'
const subscribe = () => () => {}
const OpenPanel = createContext({ open: false, setOpen: (_open: boolean) => {} })

export function AssistantWorkspace({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { selectedTenantID } = useTenantSelection()
  const memberships = assistantMemberships(user)
  const activeTenant =
    memberships.find(({ id }) => id === Number(selectedTenantID)) ??
    (memberships.length === 1 ? memberships[0] : undefined)
  const [open, setOpen] = useState(false)
  // Reset the chat session without remounting the admin or its document editor.
  const [history, setHistory] = useState<{
    tenant?: number
    user?: number | string
    messages: AssistantMessage[]
  }>({ messages: [] })
  const tenant = activeTenant?.id
  const [previous, setPrevious] = useState({ tenant, user: user?.id })
  if (previous.tenant !== tenant || previous.user !== user?.id) {
    setPrevious({ tenant, user: user?.id })
    setHistory({ tenant, user: user?.id, messages: [] })
    if (previous.user !== user?.id) setOpen(false)
  }
  return (
    <OpenPanel.Provider value={{ open, setOpen }}>
      <Conversation.Provider
        value={{
          messages: history.tenant === tenant && history.user === user?.id ? history.messages : [],
          setMessages: (messages) => setHistory({ tenant, user: user?.id, messages }),
        }}
      >
        {children}
      </Conversation.Provider>
    </OpenPanel.Provider>
  )
}

function useTenantAssistant() {
  const { user } = useAuth()
  const { selectedTenantID, options } = useTenantSelection()
  const { config } = useConfig()
  const memberships = assistantMemberships(user)
  const active =
    memberships.find(({ id }) => id === Number(selectedTenantID)) ??
    (memberships.length === 1 ? memberships[0] : undefined)
  const tenant = active && {
    ...active,
    name: String(options.find(({ value }) => Number(value) === active.id)?.label ?? 'Tenant'),
  }
  return {
    user,
    tenant,
    hasMemberships: memberships.length > 0,
    endpoint: `${config.routes.api}/assistant`,
    route: `${config.routes.admin}/assistant`,
  }
}

export function AssistantSurface({ surface = 'drawer' }: { surface?: 'page' | 'drawer' }) {
  const { i18n } = useTranslation()
  const label = adminLabels(i18n.language)
  const { endpoint, hasMemberships, tenant } = useTenantAssistant()
  return (
    <>
      {surface === 'page' && (
        <div className="optidigi-assistant-page-header">
          <div>
            <FormHeader heading={label('AI assistant', 'AI-assistent')} />
            {tenant && <Pill size="small">{tenant.name}</Pill>}
          </div>
        </div>
      )}
      {tenant ? (
        <Assistant key={tenant.id} endpoint={endpoint} surface={surface} tenant={tenant} />
      ) : (
        <Banner>
          {hasMemberships
            ? label('Choose an active website first.', 'Kies eerst een actieve website.')
            : label(
                'Ask a platform admin to give you access to a website.',
                'Vraag een beheerder om toegang tot een website.',
              )}
        </Banner>
      )}
    </>
  )
}

export function AssistantAction() {
  const { i18n } = useTranslation()
  const label = adminLabels(i18n.language)
  const { user, route } = useTenantAssistant()
  const pathname = usePathname()
  const { open, setOpen } = useContext(OpenPanel)
  const trigger = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDialogElement>(null)
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const showing = open && !pathname?.startsWith(route)

  function close() {
    panel.current?.close()
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus())
  }

  useEffect(() => {
    if (!showing) return
    const dialog = panel.current
    const screen = window.matchMedia('(max-width: 48rem)')
    function updateDialog() {
      if (dialog?.open) dialog.close()
      if (screen.matches) dialog?.showModal()
      else dialog?.show()
      dialog?.focus()
    }
    updateDialog()
    screen.addEventListener('change', updateDialog)
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        panel.current?.contains(document.activeElement)
      ) {
        event.preventDefault()
        dialog?.close()
        setOpen(false)
        requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus())
      }
    }
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('keydown', escape)
      screen.removeEventListener('change', updateDialog)
      dialog?.close()
    }
  }, [setOpen, showing])

  if (!user) return null
  return (
    <>
      <div ref={trigger}>
        {pathname?.startsWith(route) ? (
          <Link href={route}>{label('Ask AI', 'Vraag AI')}</Link>
        ) : (
          <Button
            margin={false}
            disabled={!hydrated}
            buttonStyle="secondary"
            className="optidigi-assistant-trigger"
            aria-expanded={showing}
            aria-controls="optidigi-assistant-panel"
            onClick={() => (showing ? close() : setOpen(true))}
          >
            <AssistantIcon name="spark" />
            {label('Ask AI', 'Vraag AI')}
          </Button>
        )}
      </div>
      {showing &&
        createPortal(
          <dialog
            id="optidigi-assistant-panel"
            className="optidigi-assistant-panel"
            aria-label={label('AI assistant', 'AI-assistent')}
            ref={panel}
            onCancel={(event) => {
              event.preventDefault()
              close()
            }}
          >
            <header className="optidigi-assistant-panel__header">
              <span className="optidigi-assistant-panel__title">
                <AssistantIcon name="spark" />
                <strong>{label('AI assistant', 'AI-assistent')}</strong>
              </span>
              <div>
                <Link
                  href={route}
                  aria-label={label('Expand assistant', 'Assistent vergroten')}
                  title={label('Expand assistant', 'Assistent vergroten')}
                >
                  <AssistantIcon name="expand" />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label={label('Close assistant', 'Assistent sluiten')}
                  title={label('Close assistant', 'Assistent sluiten')}
                >
                  <AssistantIcon name="close" />
                </button>
              </div>
            </header>
            <AssistantSurface />
          </dialog>,
          document.body,
        )}
    </>
  )
}

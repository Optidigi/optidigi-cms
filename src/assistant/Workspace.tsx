'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { Button, Link, useAuth, useConfig, usePathname } from '@payloadcms/ui'
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

export function AssistantSurface({ mode = 'chat' }: { mode?: 'chat' | 'settings' }) {
  const { endpoint, hasMemberships, route, tenant } = useTenantAssistant()
  return tenant ? (
    <Assistant
      key={tenant.id}
      endpoint={endpoint}
      mode={mode}
      tenant={tenant}
      settingsURL={`${route}/settings`}
    />
  ) : (
    <p className="optidigi-assistant-empty">
      {hasMemberships
        ? 'Select a tenant in the admin tenant picker.'
        : 'Ask a platform admin to add you to a tenant.'}
    </p>
  )
}

export function AssistantAction() {
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
          <Link href={route}>Ask AI</Link>
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
            Ask AI
          </Button>
        )}
      </div>
      {showing &&
        createPortal(
          <dialog
            id="optidigi-assistant-panel"
            className="optidigi-assistant-panel"
            aria-label="AI assistant"
            ref={panel}
            onCancel={(event) => {
              event.preventDefault()
              close()
            }}
          >
            <header className="optidigi-assistant-panel__header">
              <span className="optidigi-assistant-panel__title">
                <AssistantIcon name="spark" />
                <strong>Assistant</strong>
              </span>
              <div>
                <Link href={route} aria-label="Expand assistant" title="Expand assistant">
                  <AssistantIcon name="expand" />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close assistant"
                  title="Close assistant"
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

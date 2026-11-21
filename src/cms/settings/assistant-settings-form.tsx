'use client'

import { ChevronDownIcon, ExternalLinkIcon, KeyRoundIcon, PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, SparklesIcon, Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { PasswordInput } from '../auth/password-input'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from '../content/delete-dialog'
import type { Translate } from '../i18n'
import { type Provider, type Service, serviceByID, serviceGroups, serviceOf, services } from './ai-services'


export type ConnectionView = { id: string; label: string; provider: Provider; baseURL: string; hasKey: boolean; models: string[] }
export type SettingsView = { id: number; connections: ConnectionView[]; defaultModel: string }
type Listed = { id: string; name: string; tools?: boolean }

const serviceName = (service: Service, t: Translate) => service.name || t('customService')

// The connection list sent back to Payload. Keys are never read, so other rows go without one and
// keep their stored key; `change` adds a new key for one row.
function rowsFor(connections: ConnectionView[], change?: { id?: string; apiKey?: string }) {
  return connections.map(({ id, label, provider, baseURL, models }) => ({
    ...(id ? { id } : {}),
    label,
    provider,
    baseURL: baseURL.trim() || null,
    models,
    ...(change?.apiKey && change.id === id ? { apiKey: change.apiKey } : {}),
  }))
}

function toView(doc: { id: number; connections?: Partial<ConnectionView>[] | null; defaultModel?: string | null }): SettingsView {
  return {
    id: doc.id,
    defaultModel: doc.defaultModel ?? '',
    connections: (doc.connections ?? []).map((row) => ({
      id: row.id ?? '',
      label: row.label ?? '',
      provider: (row.provider ?? 'anthropic') as Provider,
      baseURL: row.baseURL ?? '',
      hasKey: Boolean(row.hasKey),
      models: row.models ?? [],
    })),
  }
}

// AI settings: the website's connections (provider, key, enabled models) and its default model.
// Members of the website see the same screen read-only; only platform administrators edit it.
export function AssistantSettingsForm({ site, editable, settings: initial }: { site: number; editable: boolean; settings?: SettingsView }) {
  const { t } = useI18n()
  const router = useRouter()
  const [settings, setSettings] = useState(initial)
  const [editing, setEditing] = useState<ConnectionView | 'new'>()
  const [removing, setRemoving] = useState<ConnectionView>()
  const connections = settings?.connections ?? []
  const options = connections.flatMap((connection) =>
    connection.hasKey ? connection.models.map((model) => ({ key: `${connection.id}:${model}`, model, connection })) : [],
  )

  // Saves the whole settings document and returns it; creates it on first use.
  async function persist(data: Record<string, unknown>) {
    const { doc } = settings
      ? await api<{ doc: Parameters<typeof toView>[0] }>(`assistant-settings/${settings.id}?depth=0`, { method: 'PATCH', json: data })
      : await api<{ doc: Parameters<typeof toView>[0] }>('assistant-settings?depth=0', { method: 'POST', json: { ...data, tenant: site } })
    const next = toView(doc)
    setSettings(next)
    router.refresh()
    return next
  }

  async function setDefault(key: string) {
    try {
      await persist({ defaultModel: key })
      toast.success(t('savedToast'))
    } catch {
      toast.error(t('saveFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!editable && (
        <Alert>
          <AlertDescription>{t('platformOnlySettings')}</AlertDescription>
        </Alert>
      )}

      {connections.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>{t('noConnections')}</EmptyTitle>
            <EmptyDescription>{t(editable ? 'noConnectionsAdmin' : 'noConnectionsMember')}</EmptyDescription>
          </EmptyHeader>
          {editable && (
            <EmptyContent>
              <Button onClick={() => setEditing('new')}>
                <PlusIcon data-icon="inline-start" />
                {t('addConnection')}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid gap-4">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {connection.label}
                    {serviceName(serviceOf(connection.provider, connection.baseURL), t) !== connection.label && (
                      <Badge variant="secondary">{serviceName(serviceOf(connection.provider, connection.baseURL), t)}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <KeyRoundIcon className="size-3.5" />
                    {connection.hasKey ? t('keySaved') : t('noKey')}
                    {connection.baseURL && !serviceOf(connection.provider, connection.baseURL).baseURL && (
                      <span className="truncate">· {connection.baseURL}</span>
                    )}
                  </CardDescription>
                  {editable && (
                    <CardAction className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={t('edit')} onClick={() => setEditing(connection)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t('delete')} onClick={() => setRemoving(connection)}>
                        <Trash2Icon />
                      </Button>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent>
                  {connection.models.length ? (
                    <div className="flex flex-wrap gap-1.5">
                    {connection.models.map((model) => (
                      <Badge key={model} variant="outline">
                        {model}
                        {settings?.defaultModel === `${connection.id}:${model}` && ` · ${t('default')}`}
                      </Badge>
                    ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('noModelsEnabled')}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {editable && (
            <div>
              <Button variant="outline" onClick={() => setEditing('new')}>
                <PlusIcon data-icon="inline-start" />
                {t('addConnection')}
              </Button>
            </div>
          )}
          {options.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('defaultModel')}</CardTitle>
                <CardDescription>{t('defaultModelDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={options.some(({ key }) => key === settings?.defaultModel) ? settings!.defaultModel : null}
                  onValueChange={(value) => value && setDefault(String(value))}
                  disabled={!editable}
                >
                  <SelectTrigger className="w-full sm:w-80" aria-label={t('defaultModel')}>
                    <SelectValue>
                      {(value: string | null) => options.find(({ key }) => key === value)?.model ?? t('firstModelDefault', { model: options[0].model })}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectGroup key={connection.id}>
                        <SelectLabel>{connection.label}</SelectLabel>
                        {options
                          .filter((option) => option.connection === connection)
                          .map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.model}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {editable && editing && (
        <ConnectionDialog
          key={editing === 'new' ? 'new' : editing.id}
          site={site}
          connection={editing === 'new' ? undefined : editing}
          connections={connections}
          persist={persist}
          onClose={() => setEditing(undefined)}
        />
      )}
      <DeleteDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        onConfirm={async () => {
          const target = removing
          if (!target) return
          try {
            const rest = connections.filter(({ id }) => id !== target.id)
            await persist({
              connections: rowsFor(rest),
              ...(settings?.defaultModel.startsWith(target.id + ':') ? { defaultModel: null } : {}),
            })
            toast.success(t('deleted'))
          } catch {
            toast.error(t('deleteFailed'))
          }
          setRemoving(undefined)
        }}
      />
    </div>
  )
}

function ConnectionDialog({
  site,
  connection,
  connections,
  persist,
  onClose,
}: {
  site: number
  connection?: ConnectionView
  connections: ConnectionView[]
  persist: (data: Record<string, unknown>) => Promise<SettingsView>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [saved, setSaved] = useState(connection)
  const savedService = saved ? serviceOf(saved.provider, saved.baseURL) : undefined
  const [service, setService] = useState<Service>(connection ? serviceOf(connection.provider, connection.baseURL) : services[0])
  const [label, setLabel] = useState(connection?.label ?? serviceName(services[0], t))
  // The name follows the chosen service until someone types their own.
  const [autoLabel, setAutoLabel] = useState(!connection || connection.label === serviceName(service, t))
  // A known service's fixed address, otherwise the typed one (a custom address, or a proxy).
  const [typedURL, setTypedURL] = useState(connection && !service.baseURL ? connection.baseURL : '')
  const provider: Provider = service.provider
  const baseURL = service.baseURL ?? typedURL
  // A saved key belongs to the service it was made for; another service needs a new one.
  const serviceChanged = Boolean(savedService && savedService.id !== service.id)
  const keyRequired = !saved?.hasKey || serviceChanged

  function chooseService(id: string) {
    const next = serviceByID(id)
    setService(next)
    if (next.id !== service.id) setTypedURL(next.id === savedService?.id && !next.baseURL ? (saved?.baseURL ?? '') : '')
    if (autoLabel) setLabel(serviceName(next, t))
  }
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<string[]>(connection?.models ?? [])
  const [listed, setListed] = useState<Listed[]>()
  const [filter, setFilter] = useState('')
  const [manual, setManual] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'load'>()
  const [loadError, setLoadError] = useState<string>()

  const changed =
    !saved || Boolean(apiKey) || label !== saved.label || provider !== saved.provider || baseURL.trim() !== saved.baseURL

  // Saves this connection (with the other rows unchanged) and returns it as stored.
  async function save(nextModels = models) {
    setErrors({})
    const row: ConnectionView = { id: saved?.id ?? '', label: label.trim(), provider, baseURL, hasKey: false, models: nextModels }
    const rows = saved ? connections.map((item) => (item.id === saved.id ? row : item)) : [...connections, row]
    const known = new Set(connections.map(({ id }) => id))
    try {
      const next = await persist({ connections: rowsFor(rows, { id: row.id, apiKey }) })
      const stored = saved ? next.connections.find(({ id }) => id === saved.id) : next.connections.find(({ id }) => !known.has(id))
      setSaved(stored)
      setApiKey('')
      return stored
    } catch (error) {
      if (error instanceof APIError) {
        // Payload names array fields by row (connections.2.baseURL); show this row's errors on this form.
        const index = saved ? rows.findIndex(({ id }) => id === saved.id) : rows.length - 1
        const prefix = `connections.${index}.`
        setErrors(
          Object.fromEntries(
            Object.entries(error.fields).flatMap(([path, message]) => (path.startsWith(prefix) ? [[path.slice(prefix.length), message]] : [])),
          ),
        )
      }
      throw error
    }
  }

  async function load() {
    setBusy('load')
    setLoadError(undefined)
    try {
      if (serviceChanged && !apiKey) {
        setLoadError(t('newKeyForService'))
        setBusy(undefined)
        return
      }
      const stored = changed ? await save() : saved
      if (!stored?.hasKey) {
        setLoadError(t('keyNeeded'))
      } else {
        const result = await api<{ models: Listed[] }>('assistant/models', { method: 'POST', json: { site, connection: stored.id } })
        setListed(result.models)
      }
    } catch (error) {
      if (!(error instanceof APIError && Object.keys(error.fields).length)) {
        setLoadError(error instanceof APIError ? error.message : t('modelsLoadFailed'))
      }
    }
    setBusy(undefined)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy('save')
    try {
      await save()
      toast.success(t('savedToast'))
      onClose()
    } catch {
      toast.error(t('saveFailed'))
    }
    setBusy(undefined)
  }

  function addManual() {
    const id = manual.trim()
    if (id && !models.includes(id)) setModels((current) => [...current, id])
    setManual('')
  }

  const toggle = (id: string, on: boolean) =>
    setModels((current) => (on ? [...current, id] : current.filter((model) => model !== id)))
  const query = filter.trim().toLowerCase()
  // Loaded models plus enabled ones the list doesn't (or no longer) include.
  const rows: Listed[] = [
    ...(listed ?? []),
    ...models.filter((model) => !listed?.some(({ id }) => id === model)).map((id) => ({ id, name: id })),
  ].filter(({ id, name }) => !query || id.toLowerCase().includes(query) || name.toLowerCase().includes(query))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{connection ? t('editConnection') : t('addConnection')}</DialogTitle>
            <DialogDescription>{t('connectionDescription')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.label ? true : undefined}>
              <FieldLabel htmlFor="connection-label">{t('connectionName')}</FieldLabel>
              <Input
                id="connection-label"
                required
                value={label}
                onChange={(event) => {
                  setLabel(event.target.value)
                  setAutoLabel(false)
                }}
              />
              <FieldError>{errors.label}</FieldError>
            </Field>
            <Field data-invalid={errors.provider ? true : undefined}>
              <FieldLabel htmlFor="service">{t('service')}</FieldLabel>
              <Select value={service.id} onValueChange={(value) => value && chooseService(String(value))}>
                <SelectTrigger id="service" className="w-full">
                  <SelectValue>{(value: string) => serviceName(serviceByID(value), t)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {serviceGroups.map(({ group, label: groupLabel }) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{t(groupLabel)}</SelectLabel>
                      {services
                        .filter((item) => item.group === group)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <span className="flex min-w-0 flex-col">
                              <span>{serviceName(item, t)}</span>
                              <span className="text-xs whitespace-normal text-muted-foreground">{t(item.description)}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t(service.description)}</FieldDescription>
              <FieldError>{errors.provider}</FieldError>
            </Field>
            {service.id === 'custom' && (
              <Field data-invalid={errors.baseURL ? true : undefined}>
                <FieldLabel htmlFor="baseURL">{t('baseURL')}</FieldLabel>
                <Input
                  id="baseURL"
                  type="url"
                  required
                  placeholder="http://localhost:11434/v1"
                  value={typedURL}
                  onChange={(event) => setTypedURL(event.target.value)}
                />
                <FieldDescription>{t('baseURLDescription')}</FieldDescription>
                <FieldError>{errors.baseURL}</FieldError>
              </Field>
            )}
            <Field data-invalid={errors.apiKey ? true : undefined}>
              <FieldLabel htmlFor="apiKey">{t('apiKey')}</FieldLabel>
              <PasswordInput
                id="apiKey"
                autoComplete="off"
                required={keyRequired}
                value={apiKey}
                placeholder={keyRequired ? undefined : t('keySavedPlaceholder')}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <FieldDescription>
                {serviceChanged ? t('newKeyForService') : t(saved?.hasKey ? 'apiKeyDescription' : 'apiKeyNewDescription')}
                {service.keyURL && (
                  <>
                    {' '}
                    {t('getKeyAt')}{' '}
                    <a href={service.keyURL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5">
                      {new URL(service.keyURL).hostname}
                      <ExternalLinkIcon className="size-3" aria-hidden />
                    </a>
                    .
                  </>
                )}
                {service.id === 'custom' && <> {t('customKeyHint')}</>}
              </FieldDescription>
              <FieldError>{errors.apiKey}</FieldError>
            </Field>
            {!service.baseURL && service.id !== 'custom' && (
              <Collapsible defaultOpen={Boolean(typedURL)}>
                <CollapsibleTrigger render={<Button type="button" variant="link" size="sm" className="h-auto px-0 text-muted-foreground" />}>
                  {t('advanced')}
                  <ChevronDownIcon data-icon="inline-end" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Field data-invalid={errors.baseURL ? true : undefined} className="pt-2">
                    <FieldLabel htmlFor="baseURL">{t('proxyAddress')}</FieldLabel>
                    <Input id="baseURL" type="url" value={typedURL} onChange={(event) => setTypedURL(event.target.value)} />
                    <FieldDescription>{t('proxyDescription', { service: serviceName(service, t) })}</FieldDescription>
                    <FieldError>{errors.baseURL}</FieldError>
                  </Field>
                </CollapsibleContent>
              </Collapsible>
            )}
            <FieldSet>
              <div className="flex items-center justify-between gap-2">
                <FieldLegend variant="label">{t('models')}</FieldLegend>
                <Button type="button" variant="outline" size="sm" disabled={Boolean(busy) || !label.trim()} onClick={load}>
                  {busy === 'load' ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
                  {t('loadModels')}
                </Button>
              </div>
              <FieldDescription>{t('modelsDescription')}</FieldDescription>
              {!service.reportsTools && <FieldDescription>{t('toolsUnknown')}</FieldDescription>}
              {loadError && (
                <Alert variant="destructive">
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              )}
              {(listed || models.length > 0) && (
                <div className="flex flex-col gap-2">
                  {listed && listed.length > 8 && (
                    <InputGroup>
                      <InputGroupAddon>
                        <SearchIcon />
                      </InputGroupAddon>
                      <InputGroupInput aria-label={t('searchModels')} placeholder={t('searchModels')} value={filter} onChange={(event) => setFilter(event.target.value)} />
                    </InputGroup>
                  )}
                  <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                    {rows.length === 0 && <p className="p-2 text-sm text-muted-foreground">{t('noModelsFound')}</p>}
                    {rows.map((model) => (
                      <Field key={model.id} orientation="horizontal" className="rounded-sm px-2 py-1.5 hover:bg-muted/50">
                        <Checkbox
                          id={`model-${model.id}`}
                          checked={models.includes(model.id)}
                          onCheckedChange={(checked) => toggle(model.id, Boolean(checked))}
                        />
                        <FieldLabel htmlFor={`model-${model.id}`} className="min-w-0 flex-1 font-normal">
                          <span className="truncate">{model.name}</span>
                          {model.name !== model.id && <span className="truncate text-xs text-muted-foreground">{model.id}</span>}
                        </FieldLabel>
                        {model.tools === false && <Badge variant="outline">{t('noTools')}</Badge>}
                      </Field>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  aria-label={t('addModelManually')}
                  placeholder={t('addModelManually')}
                  value={manual}
                  onChange={(event) => setManual(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addManual()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!manual.trim()}
                  onClick={addManual}
                >
                  {t('add')}
                </Button>
              </div>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={Boolean(busy)}>
              {busy === 'save' && <Spinner data-icon="inline-start" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

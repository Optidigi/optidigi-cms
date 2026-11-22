'use client'

import {
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { PasswordInput } from '../auth/password-input'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from '../content/delete-dialog'
import type { Translate } from '../i18n'
import { type Provider, type Service, serviceByID, serviceGroups, serviceOf, services } from './ai-services'
import { ServiceLogo, ServiceTile } from './service-logo'


export type ConnectionView = { id: string; label: string; provider: Provider; baseURL: string; hasKey: boolean; models: string[] }
export type SettingsView = { id: number; connections: ConnectionView[]; defaultModel: string }
type Listed = { id: string; name: string; tools?: boolean }

const serviceName = (service: Service, t: Translate) => service.name || t('customService')
// Groups folded under "More services" in the picker.
const moreGroups: string[] = ['other', 'custom']

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
              <ConnectionCard
                key={connection.id}
                connection={connection}
                defaultModel={settings?.defaultModel}
                editable={editable}
                onEdit={() => setEditing(connection)}
                onDelete={() => setRemoving(connection)}
              />
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
                    {connections.filter((connection) => options.some((option) => option.connection === connection)).map((connection) => (
                      <SelectGroup key={connection.id}>
                        <SelectLabel className="flex items-center gap-2">
                          <ServiceLogo service={serviceOf(connection.provider, connection.baseURL)} className="size-3.5" />
                          {connection.label}
                        </SelectLabel>
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
          defaultModel={settings?.defaultModel}
          persist={persist}
          onClose={() => setEditing(undefined)}
          onDelete={() => {
            if (editing !== 'new') setRemoving(editing)
            setEditing(undefined)
          }}
        />
      )}
      <DeleteDialog
        title={t('deleteConnectionTitle', { name: removing?.label ?? '' })}
        description={t('deleteConnectionDescription')}
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

type Step = 'service' | 'key' | 'models'

// Adding or editing a connection in three steps: the service, the key (checked by loading the
// models), and the models. Nothing is saved until the last step's Save. An existing connection
// opens on its models, loaded with its saved key.
function ConnectionDialog({
  site,
  connection,
  connections,
  defaultModel,
  persist,
  onClose,
  onDelete,
}: {
  site: number
  connection?: ConnectionView
  connections: ConnectionView[]
  defaultModel?: string
  persist: (data: Record<string, unknown>) => Promise<SettingsView>
  onClose: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const savedService = connection ? serviceOf(connection.provider, connection.baseURL) : undefined
  const [service, setService] = useState<Service>(savedService ?? services[0])
  const [label, setLabel] = useState(connection?.label ?? serviceName(services[0], t))
  // The name follows the chosen service until someone types their own.
  const [autoLabel, setAutoLabel] = useState(!connection || connection.label === serviceName(savedService!, t))
  // A known service's fixed address, otherwise the typed one (a custom address, or a proxy).
  const [typedURL, setTypedURL] = useState(connection && !savedService?.baseURL ? connection.baseURL : '')
  const provider: Provider = service.provider
  const baseURL = (service.baseURL ?? typedURL).trim()
  // A saved key belongs to the service it was made for; another service needs a new one.
  const serviceChanged = Boolean(savedService && savedService.id !== service.id)
  const keyRequired = !connection?.hasKey || serviceChanged
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<string[]>(connection?.models ?? [])
  const [listed, setListed] = useState<Listed[]>()
  const [filter, setFilter] = useState('')
  const [manual, setManual] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'load' | undefined>(connection?.hasKey ? 'load' : undefined)
  const [loadError, setLoadError] = useState<string>()
  const [step, setStep] = useState<Step>(connection ? 'models' : 'service')
  const [moreOpen, setMoreOpen] = useState(moreGroups.includes(service.group))

  function chooseService(id: string) {
    const next = serviceByID(id)
    if (next.id === service.id) return
    setService(next)
    setTypedURL(next.id === savedService?.id && !next.baseURL ? (connection?.baseURL ?? '') : '')
    if (autoLabel) setLabel(serviceName(next, t))
    // Another service has other models.
    setListed(undefined)
    setModels(next.id === savedService?.id ? (connection?.models ?? []) : [])
  }

  // Asks the server for the models with the typed key, or the saved one; an error message on failure.
  async function request(): Promise<{ models: Listed[] } | { error: string }> {
    try {
      return await api<{ models: Listed[] }>('assistant/models', {
        method: 'POST',
        json: {
          site,
          provider,
          baseURL: baseURL || null,
          ...(connection && !serviceChanged ? { connection: connection.id } : {}),
          ...(apiKey ? { apiKey } : {}),
        },
      })
    } catch (error) {
      const code = error instanceof APIError ? error.code : undefined
      return {
        error:
          code === 'key-needed'
            ? t(serviceChanged ? 'newKeyForService' : 'keyNeeded')
            : code === 'provider'
              ? t('providerRefused')
              : t('modelsLoadFailed'),
      }
    }
  }

  function apply(result: Awaited<ReturnType<typeof request>>) {
    setBusy(undefined)
    if ('error' in result) setLoadError(result.error)
    else setListed(result.models)
    return !('error' in result)
  }

  async function load() {
    setBusy('load')
    setLoadError(undefined)
    return apply(await request())
  }

  // An existing connection shows its models straight away (busy starts as 'load' for it).
  useEffect(() => {
    if (connection?.hasKey) void request().then(apply)
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function connect(event: React.FormEvent) {
    event.preventDefault()
    if (await load()) setStep('models')
  }

  async function save() {
    setErrors({})
    setBusy('save')
    const row: ConnectionView = { id: connection?.id ?? '', label: label.trim(), provider, baseURL, hasKey: false, models }
    const rows = connection ? connections.map((item) => (item.id === connection.id ? row : item)) : [...connections, row]
    // A default model this connection no longer offers is cleared, so the chat doesn't point at it.
    const staleDefault =
      connection && defaultModel?.startsWith(connection.id + ':') && !models.includes(defaultModel.slice(connection.id.length + 1))
    try {
      await persist({ connections: rowsFor(rows, { id: row.id, apiKey }), ...(staleDefault ? { defaultModel: null } : {}) })
      toast.success(t('savedToast'))
      onClose()
    } catch (error) {
      if (error instanceof APIError) {
        // Payload names array fields by row (connections.2.baseURL); show this row's errors on this form.
        const index = connection ? rows.findIndex(({ id }) => id === connection.id) : rows.length - 1
        const prefix = `connections.${index}.`
        const fields = Object.fromEntries(
          Object.entries(error.fields).flatMap(([path, message]) => (path.startsWith(prefix) ? [[path.slice(prefix.length), message]] : [])),
        )
        setErrors(fields)
        // Name, key and address live on the key step.
        if (Object.keys(fields).length) setStep('key')
      }
      toast.error(t('saveFailed'))
    } finally {
      setBusy(undefined)
    }
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

  const title = connection ? t('editConnection') : t('addConnection')
  // New connections walk through the steps; an existing one jumps between them.
  const description = (index: number, text: string) => (connection ? text : `${t('stepOf', { step: index, total: 3 })} · ${text}`)

  // The chosen service, with a button to go back and change it (or the details, on the models step).
  const serviceRow = (target: Step) => (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
      <ServiceTile service={service} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{target === 'service' ? serviceName(service, t) : label}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {target === 'service' ? t(service.description) : serviceName(service, t)}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setStep(target)}>
        {t('change')}
      </Button>
    </div>
  )

  // One group of services as shadcn choice cards.
  const serviceGroup = ({ group, label: groupLabel }: (typeof serviceGroups)[number]) => (
    <FieldSet key={group} className="gap-2">
      <FieldLegend variant="label">{t(groupLabel)}</FieldLegend>
      <div className="grid gap-2 sm:grid-cols-2">
        {services
          .filter((item) => item.group === group)
          .map((item) => (
            <FieldLabel
              key={item.id}
              htmlFor={`service-${item.id}`}
              className="has-data-checked:border-primary dark:has-data-checked:border-primary"
            >
              <Field orientation="horizontal" className="items-center">
                <ServiceTile service={item} />
                <FieldContent className="min-w-0">
                  <FieldTitle>{serviceName(item, t)}</FieldTitle>
                  <FieldDescription className="line-clamp-2 text-xs">{t(item.description)}</FieldDescription>
                </FieldContent>
                {/* Only visually hidden: the card's selected style shows the choice. */}
                <RadioGroupItem value={item.id} id={`service-${item.id}`} className="sr-only" />
              </Field>
            </FieldLabel>
          ))}
      </div>
    </FieldSet>
  )

  if (step === 'service') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{connection ? t('changeService') : title}</DialogTitle>
            <DialogDescription>{description(1, t('chooseServiceDescription'))}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={service.id} onValueChange={(value) => chooseService(String(value))} aria-label={t('service')} className="gap-5">
            {serviceGroups.filter(({ group }) => !moreGroups.includes(group)).map(serviceGroup)}
            {/* The rest of the services stay folded away until needed. */}
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
              <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" />}>
                {t('moreServices', { count: services.filter((item) => moreGroups.includes(item.group)).length })}
                <ChevronDownIcon data-icon="inline-end" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-5 pt-3">
                {serviceGroups.filter(({ group }) => moreGroups.includes(group)).map(serviceGroup)}
              </CollapsibleContent>
            </Collapsible>
          </RadioGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={connection ? () => setStep('key') : onClose}>
              {connection ? t('back') : t('cancel')}
            </Button>
            <Button type="button" onClick={() => setStep('key')}>
              {t('continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (step === 'key') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={connect} className="contents">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description(2, t('connectDescription'))}</DialogDescription>
            </DialogHeader>
            {serviceRow('service')}
            {errors.provider && <FieldError>{errors.provider}</FieldError>}
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
                  {serviceChanged ? t('newKeyForService') : t(connection?.hasKey ? 'apiKeyDescription' : 'apiKeyNewDescription')}
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
              {loadError && (
                <Alert variant="destructive">
                  <TriangleAlertIcon />
                  <AlertDescription className="flex flex-col items-start gap-1">
                    <span>{loadError}</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      onClick={() => {
                        setLoadError(undefined)
                        setStep('models')
                      }}
                    >
                      {t('skipToManual')}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => (connection ? setStep('models') : setStep('service'))}>
                {t('back')}
              </Button>
              <Button type="submit" disabled={Boolean(busy) || !label.trim()}>
                {busy === 'load' && <Spinner data-icon="inline-start" />}
                {t('connect')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{connection ? title : t('chooseModels')}</DialogTitle>
          <DialogDescription>{description(3, t('modelsDescription'))}</DialogDescription>
        </DialogHeader>
        {serviceRow('key')}
        <FieldSet>
          <FieldLegend variant="label" className="sr-only">
            {t('models')}
          </FieldLegend>
          {!service.reportsTools && <FieldDescription>{t('toolsUnknown')}</FieldDescription>}
          {busy === 'load' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {t('loadModels')}
            </div>
          )}
          {loadError && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          {!listed && !busy && !loadError && <FieldDescription>{t('modelsNotListed')}</FieldDescription>}
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
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border p-2">
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
          <Field>
            <FieldLabel htmlFor="manual-model">{t('addModelManually')}</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="manual-model"
                placeholder="provider/model-id"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addManual()
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={!manual.trim()} onClick={addManual}>
                <PlusIcon data-icon="inline-start" />
                {t('add')}
              </Button>
            </div>
          </Field>
        </FieldSet>
        <DialogFooter>
          {connection ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto" onClick={onDelete}>
              <Trash2Icon data-icon="inline-start" />
              {t('deleteConnection')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setStep('key')}>
              {t('back')}
            </Button>
          )}
          {connection && (
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
          )}
          <Button type="button" disabled={Boolean(busy) || (keyRequired && !apiKey)} onClick={save}>
            {busy === 'save' && <Spinner data-icon="inline-start" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// One connection: its service, whether a key is saved, and its enabled models (the default starred).
function ConnectionCard({
  connection,
  defaultModel,
  editable,
  onEdit,
  onDelete,
}: {
  connection: ConnectionView
  defaultModel?: string
  editable: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const service = serviceOf(connection.provider, connection.baseURL)
  const name = serviceName(service, t)
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <ServiceTile service={service} />
          <div className="grid min-w-0 gap-1">
            <CardTitle className="truncate">{connection.label}</CardTitle>
            <CardDescription className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {name !== connection.label && <span className="truncate">{name}</span>}
              {connection.baseURL && !service.baseURL && <span className="truncate">{connection.baseURL}</span>}
              {connection.hasKey ? (
                <Badge variant="secondary">
                  <CheckIcon data-icon="inline-start" className="text-green-600 dark:text-green-400" />
                  {t('keySaved')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon data-icon="inline-start" />
                  {t('noKey')}
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
        {editable && (
          <CardAction className="self-center">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('connectionActions', { name: connection.label })} />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {connection.models.length ? (
          <div className="flex flex-wrap gap-1.5">
            {connection.models.map((model) => {
              const isDefault = defaultModel === `${connection.id}:${model}`
              return (
                <Badge key={model} variant={isDefault ? 'secondary' : 'outline'}>
                  {isDefault && <StarIcon data-icon="inline-start" className="fill-current" aria-label={t('default')} />}
                  {model}
                </Badge>
              )
            })}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('noModelsEnabled')}</span>
        )}
      </CardContent>
    </Card>
  )
}

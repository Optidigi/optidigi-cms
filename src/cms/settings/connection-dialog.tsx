'use client'

import { ChevronDownIcon, ExternalLinkIcon, PlusIcon, SearchIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { PasswordInput } from '../auth/password-input'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { type ConnectionView, type Listed, moreGroups, rowsFor, serviceName, type SettingsView } from './ai-connections'
import { type Provider, type Service, serviceByID, serviceGroups, serviceOf, services } from './ai-services'
import { ServiceTile } from './service-logo'

type Step = 'service' | 'key' | 'models'

type DialogProps = {
  site: number
  connection?: ConnectionView
  connections: ConnectionView[]
  defaultModel?: string
  persist: (data: Record<string, unknown>) => Promise<SettingsView>
  onClose: () => void
  onDelete: () => void
}

// Adding or editing a connection in three steps: the service, the key (checked by loading the
// models), and the models. Nothing is saved until the last step's Save. An existing connection
// opens on its models, loaded with its saved key.
export function ConnectionDialog(props: DialogProps) {
  const draft = useConnectionDraft(props)
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className={cn('max-h-[90svh] overflow-y-auto', draft.step === 'service' ? 'sm:max-w-2xl' : 'sm:max-w-xl')}>
        {draft.step === 'service' ? <ServiceStep draft={draft} /> : draft.step === 'key' ? <KeyStep draft={draft} /> : <ModelsStep draft={draft} />}
      </DialogContent>
    </Dialog>
  )
}

type Draft = ReturnType<typeof useConnectionDraft>

// The dialog's state and actions, shared by the three steps.
function useConnectionDraft({ site, connection, connections, defaultModel, persist, onClose, onDelete }: DialogProps) {
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
  // A saved key belongs to the service and address it was saved for; another one needs a new key.
  const serviceChanged = Boolean(savedService && (savedService.id !== service.id || baseURL !== connection?.baseURL.trim()))
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

  function rename(value: string) {
    setLabel(value)
    setAutoLabel(false)
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
            : code === 'key-refused'
              ? t('keyRefused', { service: serviceName(service, t) })
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

  return {
    connection, service, label, typedURL, setTypedURL, apiKey, setApiKey, models, listed, filter, setFilter, manual,
    setManual, errors, busy, loadError, setLoadError, step, setStep, moreOpen, setMoreOpen, serviceChanged, keyRequired,
    rows, title, description, chooseService, rename, connect, save, addManual, toggle, onClose, onDelete,
  }
}

// The chosen service, with a button to go back and change it (or the details, on the models step).
function ServiceRow({ draft, target }: { draft: Draft; target: Step }) {
  const { t } = useI18n()
  const { service, label, setStep } = draft
  return (
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
}

// One group of services as shadcn choice cards.
function ServiceGroup({ group, label }: (typeof serviceGroups)[number]) {
  const { t } = useI18n()
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{t(label)}</FieldLegend>
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
}

// Step 1: which service.
function ServiceStep({ draft }: { draft: Draft }) {
  const { t } = useI18n()
  const { connection, service, title, description, chooseService, moreOpen, setMoreOpen, setStep, onClose } = draft
  return (
    <>
      <DialogHeader>
        <DialogTitle>{connection ? t('changeService') : title}</DialogTitle>
        <DialogDescription>{description(1, t('chooseServiceDescription'))}</DialogDescription>
      </DialogHeader>
      <RadioGroup value={service.id} onValueChange={(value) => chooseService(String(value))} aria-label={t('service')} className="gap-5">
        {serviceGroups.filter(({ group }) => !moreGroups.includes(group)).map((group) => <ServiceGroup key={group.group} {...group} />)}
        {/* The rest of the services stay folded away until needed. */}
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" />}>
            {t('moreServices', { count: services.filter((item) => moreGroups.includes(item.group)).length })}
            <ChevronDownIcon data-icon="inline-end" />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-5 pt-3">
            {serviceGroups.filter(({ group }) => moreGroups.includes(group)).map((group) => <ServiceGroup key={group.group} {...group} />)}
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
    </>
  )
}

// Step 2: name, key and address; Connect checks the key by loading the models.
function KeyStep({ draft }: { draft: Draft }) {
  const { t } = useI18n()
  const { connection, service, label, rename, typedURL, setTypedURL, apiKey, setApiKey, errors, busy, loadError, setLoadError } = draft
  const { keyRequired, serviceChanged, title, description, connect, setStep } = draft
  return (
    <form onSubmit={connect} className="contents">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description(2, t('connectDescription'))}</DialogDescription>
      </DialogHeader>
      <ServiceRow draft={draft} target="service" />
      {errors.provider && <FieldError>{errors.provider}</FieldError>}
      <FieldGroup>
        <Field data-invalid={errors.label ? true : undefined}>
          <FieldLabel htmlFor="connection-label">{t('connectionName')}</FieldLabel>
          <Input id="connection-label" required value={label} aria-invalid={errors.label ? true : undefined} onChange={(event) => rename(event.target.value)} />
          <FieldError>{errors.label}</FieldError>
        </Field>
        {service.id === 'custom' && (
          <Field data-invalid={errors.baseURL ? true : undefined}>
            <FieldLabel htmlFor="baseURL">{t('baseURL')}</FieldLabel>
            <Input
              id="baseURL"
              type="url"
              required
              placeholder="https://llm.example.com/v1"
              value={typedURL}
              aria-invalid={errors.baseURL ? true : undefined}
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
            aria-invalid={errors.apiKey ? true : undefined}
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
                <Input id="baseURL" type="url" value={typedURL} aria-invalid={errors.baseURL ? true : undefined} onChange={(event) => setTypedURL(event.target.value)} />
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
  )
}

// Step 3: which models the chat offers; Save stores the connection.
function ModelsStep({ draft }: { draft: Draft }) {
  const { t } = useI18n()
  const { connection, service, title, description, busy, loadError, listed, models, rows, filter, setFilter, manual, setManual } = draft
  const { addManual, toggle, keyRequired, apiKey, save, setStep, onClose, onDelete } = draft
  return (
    <>
      <DialogHeader>
        <DialogTitle>{connection ? title : t('chooseModels')}</DialogTitle>
        <DialogDescription>{description(3, t('modelsDescription'))}</DialogDescription>
      </DialogHeader>
      <ServiceRow draft={draft} target="key" />
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
                  <Checkbox id={`model-${model.id}`} checked={models.includes(model.id)} onCheckedChange={(checked) => toggle(model.id, Boolean(checked))} />
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
    </>
  )
}

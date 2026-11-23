'use client'

import { BotMessageSquareIcon, CheckIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from '../content/delete-dialog'
import { type ConnectionView, rowsFor, serviceName, type SettingsView, toView } from './ai-connections'
import { serviceOf } from './ai-services'
import { ConnectionDialog } from './connection-dialog'
import { ServiceLogo, ServiceTile } from './service-logo'

export type { ConnectionView, SettingsView }

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
              <BotMessageSquareIcon />
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

'use client'

import { ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroupButton } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { useI18n } from '../client/i18n-provider'
import { ServiceLogo } from '../settings/service-logo'
import { useAssistant, type Effort } from './assistant-context'
import type { MessageKey } from '../i18n'

// The chat's model choice, grouped by connection (shadcn's Model Selector). Shown whenever the
// website has a model, so it's clear which one answers; the panel, the full page, the overview and
// the floating bar share the same choice.
export function ModelMenu({ className }: { className?: string }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const models = assistant?.setup.state === 'ready' ? assistant.setup.models : []
  if (!assistant || models.length === 0) return null
  const selected = models.find(({ key }) => key === assistant.model)
  const connections = [...new Map(models.map((option) => [option.connectionID, option]))]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<InputGroupButton size="sm" className={cn('min-w-0', className)} aria-label={t('model')} />}>
        <span className="max-w-32 truncate">{selected?.model}</span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={assistant.model} onValueChange={(value) => assistant.setModel(String(value))}>
          {connections.map(([id, first]) => (
            <DropdownMenuGroup key={id}>
              <DropdownMenuLabel className="flex items-center gap-2">
                <ServiceLogo service={first.service} className="size-3.5" />
                {first.connection}
              </DropdownMenuLabel>
              {models
                .filter((option) => option.connectionID === id)
                .map((option) => (
                  <DropdownMenuRadioItem key={option.key} value={option.key} closeOnClick>
                    {option.model}
                  </DropdownMenuRadioItem>
                ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const effortLabels: Record<Effort, MessageKey> = {
  default: 'effortDefault',
  none: 'effortNone',
  minimal: 'effortMinimal',
  low: 'effortLow',
  medium: 'effortMedium',
  high: 'effortHigh',
  xhigh: 'effortXhigh',
  max: 'effortMax',
}

// How hard the model thinks, the second menu of shadcn's Model Selector. Lists only the levels the
// selected model supports, and is hidden for models with none (or not known yet). The trigger
// shows just the level; the menu's heading names the setting.
export function EffortMenu({ className }: { className?: string }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  if (!assistant || assistant.setup.state !== 'ready' || !assistant.capabilities.efforts.length) return null
  const options: Effort[] = ['default', ...assistant.capabilities.efforts]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<InputGroupButton size="sm" className={cn('min-w-0', className)} aria-label={t('effort')} />}>
        <span className="truncate">{t(effortLabels[assistant.effort])}</span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('effort')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={assistant.effort} onValueChange={(value) => assistant.setEffort(value as Effort)}>
            {options.map((effort) => (
              <DropdownMenuRadioItem key={effort} value={effort} closeOnClick>
                {t(effortLabels[effort])}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

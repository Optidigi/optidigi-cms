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
import { useAssistant } from './assistant-context'

// The chat's model choice, grouped by connection. Shown only when the website has more than one
// model; the panel, the full page and the floating bar share the same choice.
export function ModelMenu({ className }: { className?: string }) {
  const assistant = useAssistant()
  const { t } = useI18n()
  const models = assistant?.setup.state === 'ready' ? assistant.setup.models : []
  if (!assistant || models.length < 2) return null
  const selected = models.find(({ key }) => key === assistant.model)
  const connections = [...new Map(models.map((option) => [option.connectionID, option.connection]))]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<InputGroupButton size="sm" className={cn('min-w-0', className)} aria-label={t('model')} />}>
        <span className="max-w-32 truncate">{selected?.model}</span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={assistant.model} onValueChange={(value) => assistant.setModel(String(value))}>
          {connections.map(([id, label]) => (
            <DropdownMenuGroup key={id}>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
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

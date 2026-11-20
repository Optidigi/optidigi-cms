'use client'

import { RadioGroup } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { Switch } from '@base-ui/react/switch'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useId, useState, useTransition } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAdminTranslations } from './i18n-context'
import { savePreferences } from './preference-actions'
import type { Preferences } from './preferences'

type Site = { id: number; name: string }
const themeOptions = [
  { id: 'system', label: 'Systeem', Icon: Monitor },
  { id: 'light', label: 'Licht', Icon: Sun },
  { id: 'dark', label: 'Donker', Icon: Moon },
] as const

export function PreferenceForm({
  initial,
  savedTheme,
  sites,
}: {
  initial: Preferences
  savedTheme?: Preferences['theme']
  sites: Site[]
}) {
  const t = useAdminTranslations()
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState(initial)
  const [feedback, setFeedback] = useState<'saved' | 'error'>()
  const [pending, run] = useTransition()
  const field = useId()
  const siteOptions: { id: number | null; name: string }[] = [
    { id: null, name: t('Laatst gebruikt') },
    ...sites,
  ]
  const selected = siteOptions.find(({ id }) => id === settings.website) ?? siteOptions[0]

  function submit(value: Preferences | null) {
    run(async () => {
      setFeedback(undefined)
      try {
        if (!(await savePreferences(value))) throw new Error('Preference update failed')
        if (!value) {
          setTheme('system')
          setSettings({ language: 'nl', theme: 'system', website: null, sidebarOpen: true })
        } else if (savedTheme === value.theme) setTheme(value.theme)
        setFeedback('saved')
      } catch {
        setFeedback('error')
      }
    })
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t('Weergave en werkruimte')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-7"
          onSubmit={(event) => {
            event.preventDefault()
            submit(settings)
          }}
        >
          <FieldSet>
            <FieldLegend id={field + '-theme'}>{t('Kleurmodus')}</FieldLegend>
            <RadioGroup
              aria-labelledby={field + '-theme'}
              value={settings.theme}
              onValueChange={(theme) =>
                setSettings({ ...settings, theme: theme as Preferences['theme'] })
              }
              className="grid grid-cols-3 gap-2"
            >
              {themeOptions.map(({ id, label, Icon }) => (
                <Radio.Root
                  key={id}
                  value={id}
                  className="group grid min-w-0 gap-2 rounded-lg border p-2 text-sm data-checked:border-primary data-checked:ring-1 data-checked:ring-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden
                    className={`grid h-12 place-items-center rounded-md border ${id === 'light' ? 'bg-white text-slate-900' : id === 'dark' ? 'bg-slate-950 text-white' : 'bg-muted text-foreground'}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>{t(label)}</span>
                </Radio.Root>
              ))}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend id={field + '-language'}>{t('Interfacetaal')}</FieldLegend>
            <RadioGroup
              aria-labelledby={field + '-language'}
              value={settings.language}
              onValueChange={(language) =>
                setSettings({ ...settings, language: language as Preferences['language'] })
              }
              className="flex flex-wrap gap-2"
            >
              {[
                ['nl', 'Nederlands'],
                ['en', 'English'],
              ].map(([value, label]) => (
                <Radio.Root
                  key={value}
                  value={value}
                  className="flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm data-checked:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Radio.Indicator>
                    <Check className="size-4" aria-hidden />
                  </Radio.Indicator>
                  {label}
                </Radio.Root>
              ))}
            </RadioGroup>
          </FieldSet>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <label htmlFor={field + '-sidebar'} className="text-sm font-medium">
                {t('Zijbalk uitgeklapt starten')}
              </label>
              <FieldDescription>{t('Geldt voor de desktopweergave.')}</FieldDescription>
            </div>
            <Switch.Root
              id={field + '-sidebar'}
              checked={settings.sidebarOpen}
              onCheckedChange={(sidebarOpen) => setSettings({ ...settings, sidebarOpen })}
              className="relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-input p-0.5 data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Switch.Thumb className="size-4 rounded-full bg-background transition-transform data-checked:translate-x-4" />
            </Switch.Root>
          </div>
          <div className="space-y-2">
            <label htmlFor={field + '-website'} className="text-sm font-medium">
              {t('Startwebsite')}
            </label>
            <Combobox.Root
              items={siteOptions}
              value={selected}
              itemToStringLabel={(item) => item.name}
              isItemEqualToValue={(a, b) => a.id === b.id}
              onValueChange={(value) => setSettings({ ...settings, website: value?.id ?? null })}
            >
              <div className="relative">
                <Combobox.Input id={field + '-website'} render={<Input className="pe-9" />} />
                <Combobox.Trigger
                  className="absolute inset-y-0 end-0 px-2"
                  aria-label={t('Website kiezen')}
                >
                  <ChevronDown className="size-4" />
                </Combobox.Trigger>
              </div>
              <Combobox.Portal>
                <Combobox.Positioner sideOffset={5} className="z-50">
                  <Combobox.Popup className="max-h-64 min-w-(--anchor-width) overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <Combobox.Empty className="p-2 text-sm">{t('Geen resultaten')}</Combobox.Empty>
                    <Combobox.List>
                      {(item: (typeof siteOptions)[number]) => (
                        <Combobox.Item
                          key={item.id ?? 'last'}
                          value={item}
                          className="flex cursor-default items-center justify-between gap-2 rounded p-2 text-sm data-highlighted:bg-accent"
                        >
                          {item.name}
                          <Combobox.ItemIndicator>
                            <Check className="size-4" />
                          </Combobox.ItemIndicator>
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {t('Wijzigingen opslaan')}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => submit(null)}>
              {t('Standaardinstellingen herstellen')}
            </Button>
          </div>
          {feedback && (
            <Alert
              role={feedback === 'error' ? 'alert' : 'status'}
              variant={feedback === 'error' ? 'destructive' : 'default'}
            >
              <AlertDescription>
                {t(
                  feedback === 'saved'
                    ? 'Wijzigingen opgeslagen.'
                    : 'Voorkeuren konden niet worden opgeslagen.',
                )}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

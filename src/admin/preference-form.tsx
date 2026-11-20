'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useId, useState, useTransition } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { useAdminTranslations, useEditingGuard } from './i18n-context'
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
  const { markDirty } = useEditingGuard()
  useEffect(() => () => markDirty(false), [markDirty])
  function edit(next: Preferences) {
    markDirty(true)
    setFeedback(undefined)
    setSettings(next)
  }
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
        markDirty(false)
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
              onValueChange={(theme) => edit({ ...settings, theme: theme as Preferences['theme'] })}
              className="grid grid-cols-3 gap-2"
            >
              {themeOptions.map(({ id, label, Icon }) => (
                <FieldLabel
                  key={id}
                  className="grid min-w-0 cursor-pointer gap-2 rounded-lg border p-2 has-data-checked:border-primary"
                >
                  <span
                    aria-hidden
                    className={`grid h-12 place-items-center rounded-md border ${id === 'light' ? 'bg-white text-slate-900' : id === 'dark' ? 'bg-slate-950 text-white' : 'bg-muted text-foreground'}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value={id} />
                    {t(label)}
                  </span>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend id={field + '-language'}>{t('Interfacetaal')}</FieldLegend>
            <RadioGroup
              aria-labelledby={field + '-language'}
              value={settings.language}
              onValueChange={(language) =>
                edit({ ...settings, language: language as Preferences['language'] })
              }
              className="flex flex-wrap gap-2"
            >
              {[
                ['nl', 'Nederlands'],
                ['en', 'English'],
              ].map(([value, label]) => (
                <FieldLabel
                  key={value}
                  className="flex min-h-9 items-center gap-2 rounded-md border px-3 has-data-checked:border-primary"
                >
                  <RadioGroupItem value={value} />
                  {label}
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <FieldLabel htmlFor={field + '-sidebar'} className="text-sm font-medium">
                {t('Zijbalk uitgeklapt starten')}
              </FieldLabel>
              <FieldDescription>{t('Geldt voor de desktopweergave.')}</FieldDescription>
            </div>
            <Switch
              id={field + '-sidebar'}
              checked={settings.sidebarOpen}
              onCheckedChange={(sidebarOpen) => edit({ ...settings, sidebarOpen })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor={field + '-website'} className="text-sm font-medium">
              {t('Startwebsite')}
            </FieldLabel>
            <Combobox
              items={siteOptions}
              value={selected}
              itemToStringLabel={(item) => item.name}
              isItemEqualToValue={(a, b) => a.id === b.id}
              onValueChange={(value) => edit({ ...settings, website: value?.id ?? null })}
            >
              <ComboboxInput id={field + '-website'} className="w-full" />
              <ComboboxContent>
                <ComboboxEmpty>{t('Geen resultaten')}</ComboboxEmpty>
                <ComboboxList>
                  {(item: (typeof siteOptions)[number]) => (
                    <ComboboxItem key={item.id ?? 'last'} value={item}>
                      {item.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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

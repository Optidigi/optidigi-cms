'use client'

import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { isLanguage } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  accents,
  appearanceAttributes,
  fonts,
  radii,
  textSizes,
  type Accent,
  type Font,
  type Preferences,
  type Radius,
  type TextSize,
} from '../preferences'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { useHydrated } from '../client/use-hydrated'
import { usePreferences } from '../shell/preferences-context'

const accentLabels: Record<Accent, MessageKey> = {
  default: 'accentDefault',
  blue: 'accentBlue',
  violet: 'accentViolet',
  green: 'accentGreen',
  orange: 'accentOrange',
  rose: 'accentRose',
}
// The primaries of shadcn's official themes, as in admin.css, for the swatches.
const swatches: Record<'light' | 'dark', Record<Accent, string>> = {
  light: {
    default: 'oklch(0.205 0 0)',
    blue: 'hsl(221.2 83.2% 53.3%)',
    violet: 'hsl(262.1 83.3% 57.8%)',
    green: 'hsl(142.1 76.2% 36.3%)',
    orange: 'hsl(24.6 95% 53.1%)',
    rose: 'hsl(346.8 77.2% 49.8%)',
  },
  dark: {
    default: 'oklch(0.922 0 0)',
    blue: 'hsl(217.2 91.2% 59.8%)',
    violet: 'hsl(263.4 70% 50.4%)',
    green: 'hsl(142.1 70.6% 45.3%)',
    orange: 'hsl(20.5 90.2% 48.2%)',
    rose: 'hsl(346.8 77.2% 49.8%)',
  },
}
const fontOptions: Record<Font, { name?: string; label?: MessageKey; hint: MessageKey; family: string }> = {
  geist: { name: 'Geist', hint: 'fontDefaultHint', family: 'var(--font-geist-sans)' },
  inter: { name: 'Inter', hint: 'fontInterHint', family: 'var(--font-inter)' },
  atkinson: { name: 'Atkinson Hyperlegible', hint: 'fontAtkinsonHint', family: 'var(--font-atkinson)' },
  system: { label: 'fontSystem', hint: 'fontSystemHint', family: 'ui-sans-serif, system-ui, sans-serif' },
}
const sizeOptions: Record<TextSize, { label: MessageKey; className: string }> = {
  default: { label: 'sizeDefault', className: 'text-sm' },
  large: { label: 'sizeLarge', className: 'text-base' },
}
const radiusOptions: Record<Radius, { label: MessageKey; value: string }> = {
  none: { label: 'radiusNone', value: '0' },
  small: { label: 'radiusSmall', value: '0.25rem' },
  default: { label: 'radiusDefault', value: '0.4rem' },
  round: { label: 'radiusRound', value: '0.65rem' },
}

// Puts the appearance on <html> straight away, the same attributes the server renders.
function applyAppearance(preferences: Preferences) {
  for (const [name, value] of Object.entries(appearanceAttributes(preferences))) {
    if (value === undefined) document.documentElement.removeAttribute(name)
    else document.documentElement.setAttribute(name, value)
  }
}

// Weergave: language and appearance for the signed-in user. Every choice applies at once and is
// saved to Payload's preferences. Each single choice is shadcn's choice card (a RadioGroup inside
// Field); the radio itself is only visually hidden, so keyboards and screen readers keep it, and
// the card's own selected style shows the choice.
export function PreferencesForm() {
  const { t } = useI18n()
  const stored = usePreferences()
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const hydrated = useHydrated()
  const [preferences, setPreferences] = useState(stored)

  async function change(update: Partial<Preferences>) {
    const next = { ...preferences, ...update }
    setPreferences(next)
    if (update.theme) setTheme(update.theme)
    applyAppearance(next)
    try {
      await savePreferences(stored, update)
      // The language is rendered on the server.
      if (update.language) router.refresh()
    } catch {
      toast.error(t('saveFailed'))
    }
  }

  // With the automatic theme the device picks light or dark and the swatch shows in that row. The
  // device's choice is known only after the page has loaded; until then nothing is marked.
  const mode =
    preferences.theme === 'system'
      ? hydrated && (resolvedTheme === 'dark' || resolvedTheme === 'light')
        ? resolvedTheme
        : undefined
      : preferences.theme

  function card(
    name: string,
    value: string,
    content: React.ReactNode,
    { compact = false, className }: { compact?: boolean; className?: string } = {},
  ) {
    return (
      <FieldLabel
        key={value}
        htmlFor={`${name}-${value}`}
        className={cn(
          'has-data-checked:border-primary dark:has-data-checked:border-primary',
          compact && '*:data-[slot=field]:px-3 *:data-[slot=field]:py-2',
          className,
        )}
      >
        <Field orientation="horizontal">
          <FieldContent className="min-w-0">{content}</FieldContent>
          <RadioGroupItem value={value} id={`${name}-${value}`} className="sr-only" />
        </Field>
      </FieldLabel>
    )
  }

  return (
    <Card>
      <CardContent>
        <FieldGroup>
          <FieldDescription>{t('appliedAutomatically')}</FieldDescription>
          <FieldSet>
            <FieldLegend variant="label">{t('interfaceLanguage')}</FieldLegend>
            <RadioGroup
              value={preferences.language}
              onValueChange={(value) => isLanguage(value) && change({ language: value })}
              className="grid-cols-2 sm:max-w-sm"
            >
              {card('language', 'nl', <FieldTitle>{t('dutch')}</FieldTitle>, { compact: true })}
              {card('language', 'en', <FieldTitle>{t('english')}</FieldTitle>, { compact: true })}
            </RadioGroup>
          </FieldSet>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend variant="label">{t('themeLabel')}</FieldLegend>
            <RadioGroup
              value={mode ? `${mode}:${preferences.accent}` : ''}
              onValueChange={(value) => {
                const [nextMode, accent] = String(value).split(':') as ['light' | 'dark', Accent]
                change({ theme: nextMode, accent })
              }}
              className="gap-4"
            >
              {(['light', 'dark'] as const).map((row) => (
                <div key={row} role="group" aria-label={t(row)} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t(row)}</span>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {accents.map((accent) =>
                      card(
                        'theme',
                        `${row}:${accent}`,
                        <>
                          <span
                            aria-hidden
                            className={cn(
                              'flex h-8 w-full items-end gap-1 rounded-sm border p-1.5',
                              row === 'dark' ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-white',
                            )}
                          >
                            <span className="h-2 w-5 rounded-full" style={{ background: swatches[row][accent] }} />
                            <span className={cn('h-1.5 flex-1 rounded-full', row === 'dark' ? 'bg-neutral-700' : 'bg-neutral-200')} />
                          </span>
                          <FieldTitle className="text-xs">
                            <span className="sr-only">{t(row)} </span>
                            {t(accentLabels[accent])}
                          </FieldTitle>
                        </>,
                        { compact: true, className: '*:data-[slot=field]:p-2' },
                      ),
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="theme-system">{t('themeAutomatic')}</FieldLabel>
                <FieldDescription>{t('themeAutomaticDescription')}</FieldDescription>
              </FieldContent>
              <Switch
                id="theme-system"
                checked={preferences.theme === 'system'}
                onCheckedChange={(checked) => change({ theme: checked ? 'system' : (mode ?? 'light') })}
              />
            </Field>
          </FieldSet>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend variant="label">{t('fontLabel')}</FieldLegend>
            <RadioGroup value={preferences.font} onValueChange={(value) => change({ font: value as Font })} className="gap-2 sm:grid-cols-2">
              {fonts.map((font) => {
                const option = fontOptions[font]
                return card(
                  'font',
                  font,
                  <>
                    <FieldTitle className="text-base" style={{ fontFamily: option.family }}>
                      {option.name ?? t(option.label!)}
                    </FieldTitle>
                    <FieldDescription>{t(option.hint)}</FieldDescription>
                  </>,
                  { compact: true },
                )
              })}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">{t('textSize')}</FieldLegend>
            <RadioGroup value={preferences.textSize} onValueChange={(value) => change({ textSize: value as TextSize })} className="grid-cols-2 gap-2 sm:max-w-sm">
              {textSizes.map((size) =>
                card('text-size', size, <FieldTitle className={sizeOptions[size].className}>{t(sizeOptions[size].label)}</FieldTitle>, { compact: true }),
              )}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">{t('cornerRounding')}</FieldLegend>
            <RadioGroup value={preferences.radius} onValueChange={(value) => change({ radius: value as Radius })} className="grid-cols-2 gap-2 sm:grid-cols-4">
              {radii.map((radius) =>
                card(
                  'radius',
                  radius,
                  <FieldTitle>
                    <span
                      aria-hidden
                      className="size-3.5 shrink-0 border-t-2 border-l-2 border-foreground/70"
                      style={{ borderTopLeftRadius: radiusOptions[radius].value }}
                    />
                    {t(radiusOptions[radius].label)}
                  </FieldTitle>,
                  { compact: true },
                ),
              )}
            </RadioGroup>
          </FieldSet>
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="reduce-motion">{t('reduceMotion')}</FieldLabel>
              <FieldDescription>{t('reduceMotionDescription')}</FieldDescription>
            </FieldContent>
            <Switch id="reduce-motion" checked={preferences.reduceMotion} onCheckedChange={(checked) => change({ reduceMotion: checked })} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

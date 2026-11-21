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
  themes,
  type Accent,
  type Font,
  type Preferences,
  type Radius,
  type TextSize,
} from '../preferences'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { usePreferences } from '../shell/preferences-context'

const accentLabels: Record<Accent, MessageKey> = {
  default: 'accentDefault',
  blue: 'accentBlue',
  violet: 'accentViolet',
  green: 'accentGreen',
  orange: 'accentOrange',
  rose: 'accentRose',
}
// The swatch colours are the light-mode primaries of shadcn's themes, as in admin.css.
const accentSwatches: Record<Accent, string> = {
  default: 'var(--foreground)',
  blue: 'hsl(221.2 83.2% 53.3%)',
  violet: 'hsl(262.1 83.3% 57.8%)',
  green: 'hsl(142.1 76.2% 36.3%)',
  orange: 'hsl(24.6 95% 53.1%)',
  rose: 'hsl(346.8 77.2% 49.8%)',
}
const fontOptions: Record<Font, { name?: string; label?: MessageKey; hint: MessageKey; family: string }> = {
  geist: { name: 'Geist', hint: 'fontDefaultHint', family: 'var(--font-geist-sans)' },
  inter: { name: 'Inter', hint: 'fontInterHint', family: 'var(--font-inter)' },
  atkinson: { name: 'Atkinson Hyperlegible', hint: 'fontAtkinsonHint', family: 'var(--font-atkinson)' },
  system: { label: 'fontSystem', hint: 'fontSystemHint', family: 'ui-sans-serif, system-ui, sans-serif' },
}
const sizeLabels: Record<TextSize, MessageKey> = { default: 'sizeDefault', large: 'sizeLarge' }
const radiusOptions: Record<Radius, { label: MessageKey; value: string }> = {
  none: { label: 'radiusNone', value: '0' },
  small: { label: 'radiusSmall', value: '0.375rem' },
  default: { label: 'radiusDefault', value: '0.625rem' },
  round: { label: 'radiusRound', value: '1rem' },
}

// Puts the appearance on <html> straight away, the same attributes the server renders.
function applyAppearance(preferences: Preferences) {
  for (const [name, value] of Object.entries(appearanceAttributes(preferences))) {
    if (value === undefined) document.documentElement.removeAttribute(name)
    else document.documentElement.setAttribute(name, value)
  }
}

// A sketch of the interface in light or dark, for the theme cards.
function ThemeSketch({ dark }: { dark: boolean }) {
  return (
    <span
      aria-hidden
      className={cn('flex h-16 w-full flex-col gap-1.5 rounded-md border p-2', dark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-white')}
    >
      <span className={cn('h-2 w-2/3 rounded-sm', dark ? 'bg-neutral-600' : 'bg-neutral-300')} />
      <span className={cn('h-2 w-full rounded-sm', dark ? 'bg-neutral-700' : 'bg-neutral-200')} />
      <span className={cn('h-2 w-5/6 rounded-sm', dark ? 'bg-neutral-700' : 'bg-neutral-200')} />
    </span>
  )
}

// Language and appearance for the signed-in user. Every choice applies at once and is saved to
// Payload's preferences; the choices use shadcn's choice cards (RadioGroup inside Field).
export function PreferencesForm() {
  const { t } = useI18n()
  const stored = usePreferences()
  const router = useRouter()
  const { setTheme } = useTheme()
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

  function card(name: string, value: string, title: React.ReactNode, options: { preview?: React.ReactNode; description?: string } = {}) {
    return (
      <FieldLabel key={value} htmlFor={`${name}-${value}`}>
        <Field orientation="horizontal" className="items-start">
          <FieldContent className="min-w-0">
            {options.preview}
            <FieldTitle>{title}</FieldTitle>
            {options.description && <FieldDescription>{options.description}</FieldDescription>}
          </FieldContent>
          <RadioGroupItem value={value} id={`${name}-${value}`} />
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
              className="sm:grid-cols-2"
            >
              {card('language', 'nl', t('dutch'))}
              {card('language', 'en', t('english'))}
            </RadioGroup>
          </FieldSet>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend>{t('appearance')}</FieldLegend>
            <FieldGroup>
              <FieldSet>
                <FieldLegend variant="label">{t('themeLabel')}</FieldLegend>
                <RadioGroup value={preferences.theme} onValueChange={(value) => change({ theme: value as Preferences['theme'] })} className="grid-cols-3">
                  {themes.map((theme) =>
                    card('theme', theme, t(theme), {
                      preview:
                        theme === 'system' ? (
                          // Half light, half dark: the device decides.
                          <span className="relative block w-full">
                            <ThemeSketch dark={false} />
                            <span className="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
                              <ThemeSketch dark />
                            </span>
                          </span>
                        ) : (
                          <ThemeSketch dark={theme === 'dark'} />
                        ),
                    }),
                  )}
                </RadioGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend variant="label">{t('accentColor')}</FieldLegend>
                <RadioGroup value={preferences.accent} onValueChange={(value) => change({ accent: value as Accent })} className="grid-cols-2 sm:grid-cols-3">
                  {accents.map((accent) =>
                    card(
                      'accent',
                      accent,
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="size-4 shrink-0 rounded-full border" style={{ background: accentSwatches[accent] }} />
                        {t(accentLabels[accent])}
                      </span>,
                    ),
                  )}
                </RadioGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend variant="label">{t('fontLabel')}</FieldLegend>
                <RadioGroup value={preferences.font} onValueChange={(value) => change({ font: value as Font })} className="sm:grid-cols-2">
                  {fonts.map((font) => {
                    const option = fontOptions[font]
                    const name = option.name ?? t(option.label!)
                    return card('font', font, <span style={{ fontFamily: option.family }}>{name}</span>, {
                      preview: (
                        <span aria-hidden className="text-2xl leading-none" style={{ fontFamily: option.family }}>
                          Aa
                        </span>
                      ),
                      description: t(option.hint),
                    })
                  })}
                </RadioGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend variant="label">{t('textSize')}</FieldLegend>
                <RadioGroup value={preferences.textSize} onValueChange={(value) => change({ textSize: value as TextSize })} className="grid-cols-2">
                  {textSizes.map((size) =>
                    card('text-size', size, t(sizeLabels[size]), {
                      preview: (
                        <span aria-hidden className={cn('leading-none', size === 'large' ? 'text-[18px]' : 'text-[16px]')}>
                          Aa
                        </span>
                      ),
                    }),
                  )}
                </RadioGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend variant="label">{t('cornerRounding')}</FieldLegend>
                <RadioGroup value={preferences.radius} onValueChange={(value) => change({ radius: value as Radius })} className="grid-cols-2 sm:grid-cols-4">
                  {radii.map((radius) =>
                    card('radius', radius, t(radiusOptions[radius].label), {
                      preview: (
                        <span
                          aria-hidden
                          className="block size-8 border-t-2 border-l-2 border-foreground/60"
                          style={{ borderTopLeftRadius: radiusOptions[radius].value }}
                        />
                      ),
                    }),
                  )}
                </RadioGroup>
              </FieldSet>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="reduce-motion">{t('reduceMotion')}</FieldLabel>
                  <FieldDescription>{t('reduceMotionDescription')}</FieldDescription>
                </FieldContent>
                <Switch id="reduce-motion" checked={preferences.reduceMotion} onCheckedChange={(checked) => change({ reduceMotion: checked })} />
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

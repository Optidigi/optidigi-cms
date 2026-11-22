'use client'

import { CheckIcon } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { isLanguage } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  accents,
  appearanceAttributes,
  fonts,
  radii,
  themes,
  type Accent,
  type Font,
  type Preferences,
  type Radius,
  type Theme,
} from '../preferences'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { usePreferences } from '../shell/preferences-context'

const themeLabels: Record<Theme, MessageKey> = { light: 'light', dark: 'dark', system: 'system' }
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
              value={preferences.theme}
              onValueChange={(value) => change({ theme: value as Theme })}
              className="grid-cols-3 gap-2 sm:max-w-lg"
            >
              {themes.map((theme) =>
                card(
                  'theme',
                  theme,
                  <>
                    <ModePreview mode={theme} accent={preferences.accent} />
                    <FieldTitle className="text-xs">{t(themeLabels[theme])}</FieldTitle>
                  </>,
                  { compact: true, className: '*:data-[slot=field]:p-2' },
                ),
              )}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">{t('accentLabel')}</FieldLegend>
            <RadioGroup
              value={preferences.accent}
              onValueChange={(value) => change({ accent: value as Accent })}
              className="flex flex-wrap gap-x-2 gap-y-2"
            >
              {accents.map((accent) => (
                <FieldLabel
                  key={accent}
                  htmlFor={`accent-${accent}`}
                  className="group/swatch w-11 flex-col items-center gap-1.5 text-xs font-normal text-muted-foreground has-data-checked:bg-transparent has-data-checked:text-foreground dark:has-data-checked:bg-transparent"
                >
                  <span
                    aria-hidden
                    style={{ '--swatch-light': swatches.light[accent], '--swatch-dark': swatches.dark[accent] } as React.CSSProperties}
                    className="flex size-8 items-center justify-center rounded-full bg-(--swatch-light) ring-offset-2 ring-offset-background group-has-focus-visible/swatch:ring-2 group-has-focus-visible/swatch:ring-ring/50 group-has-data-checked/swatch:ring-2 group-has-data-checked/swatch:ring-(--swatch-light) dark:bg-(--swatch-dark) dark:group-has-data-checked/swatch:ring-(--swatch-dark)"
                  >
                    <CheckIcon className="hidden size-4 text-white mix-blend-difference group-has-data-checked/swatch:block" />
                  </span>
                  {t(accentLabels[accent])}
                  <RadioGroupItem value={accent} id={`accent-${accent}`} className="sr-only" />
                </FieldLabel>
              ))}
            </RadioGroup>
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
            <FieldLegend variant="label">{t('cornerRounding')}</FieldLegend>
            <RadioGroup value={preferences.radius} onValueChange={(value) => change({ radius: value as Radius })} className="flex flex-wrap gap-2">
              {radii.map((radius) => (
                <Tooltip key={radius}>
                  <TooltipTrigger
                    render={
                      <FieldLabel
                        htmlFor={`radius-${radius}`}
                        className="has-data-checked:border-primary has-[>[data-slot=field]]:w-12 *:data-[slot=field]:size-12 *:data-[slot=field]:p-0 dark:has-data-checked:border-primary"
                      />
                    }
                  >
                    <Field orientation="horizontal" className="relative items-center justify-center gap-0">
                      <span
                        aria-hidden
                        className="absolute inset-0 m-auto size-4 border-t-2 border-l-2 border-foreground/70"
                        style={{ borderTopLeftRadius: radiusOptions[radius].value }}
                      />
                      <span className="sr-only">{t(radiusOptions[radius].label)}</span>
                      <RadioGroupItem value={radius} id={`radius-${radius}`} className="sr-only" />
                    </Field>
                  </TooltipTrigger>
                  <TooltipContent>{t(radiusOptions[radius].label)}</TooltipContent>
                </Tooltip>
              ))}
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

// A small picture of the CMS in a mode, with the chosen accent; the system mode shows both halves.
function ModePreview({ mode, accent }: { mode: Theme; accent: Accent }) {
  const pane = (shade: 'light' | 'dark') => (
    <span className={cn('absolute inset-0 flex gap-1 p-1.5', shade === 'dark' ? 'bg-neutral-900' : 'bg-white')}>
      <span className={cn('w-3 rounded-sm', shade === 'dark' ? 'bg-neutral-800' : 'bg-neutral-100')} />
      <span className="flex flex-1 flex-col gap-1">
        <span className={cn('h-1.5 w-3/4 rounded-full', shade === 'dark' ? 'bg-neutral-700' : 'bg-neutral-200')} />
        <span className={cn('h-1.5 w-1/2 rounded-full', shade === 'dark' ? 'bg-neutral-700' : 'bg-neutral-200')} />
        <span className="mt-auto h-2 w-6 rounded-full" style={{ background: swatches[shade][accent] }} />
      </span>
    </span>
  )
  return (
    <span aria-hidden className="relative block h-14 w-full overflow-hidden rounded-sm border border-neutral-300 dark:border-neutral-700">
      {mode === 'system' ? (
        <>
          {pane('light')}
          <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">{pane('dark')}</span>
        </>
      ) : (
        pane(mode)
      )}
    </span>
  )
}

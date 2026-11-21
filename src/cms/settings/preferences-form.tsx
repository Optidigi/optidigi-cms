'use client'

import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldContent, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { isLanguage, type Language } from '../i18n'
import type { Theme } from '../preferences'
import { useI18n } from '../client/i18n-provider'
import { savePreferences } from '../client/preferences'
import { usePreferences } from '../shell/preferences-context'

export function PreferencesForm() {
  const { t } = useI18n()
  const preferences = usePreferences()
  const router = useRouter()
  const { setTheme } = useTheme()
  const [language, setLanguage] = useState<Language>(preferences.language)
  const [theme, setThemeValue] = useState<Theme>(preferences.theme)
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await savePreferences({ ...preferences, language, theme })
      setTheme(theme)
      toast.success(t('savedToast'))
      router.refresh()
    } catch {
      toast.error(t('saveFailed'))
    }
    setSaving(false)
  }

  const choice = (name: string, value: string, label: string) => (
    <FieldLabel key={value} htmlFor={`${name}-${value}`}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{label}</FieldTitle>
        </FieldContent>
        <RadioGroupItem value={value} id={`${name}-${value}`} />
      </Field>
    </FieldLabel>
  )

  return (
    <form onSubmit={save}>
    <Card>
      <CardContent>
        <FieldGroup>
          <FieldSet>
            <FieldLegend variant="label">{t('interfaceLanguage')}</FieldLegend>
            <RadioGroup value={language} onValueChange={(value) => isLanguage(value) && setLanguage(value)} className="sm:grid-cols-2">
              {choice('language', 'nl', t('dutch'))}
              {choice('language', 'en', t('english'))}
            </RadioGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">{t('appearance')}</FieldLegend>
            <RadioGroup value={theme} onValueChange={(value) => setThemeValue(value as Theme)} className="sm:grid-cols-3">
              {choice('theme', 'system', t('system'))}
              {choice('theme', 'light', t('light'))}
              {choice('theme', 'dark', t('dark'))}
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Spinner data-icon="inline-start" />}
          {t('save')}
        </Button>
      </CardFooter>
    </Card>
    </form>
  )
}

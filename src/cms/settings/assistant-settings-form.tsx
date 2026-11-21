'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'

type Provider = 'anthropic' | 'openai' | 'openai-compatible'
const providers: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI', 'openai-compatible': 'OpenAI-compatible' }

export function AssistantSettingsForm({
  site,
  editable,
  settings,
}: {
  site: number
  editable: boolean
  settings?: { id: number; provider: Provider; baseURL: string; models: string[] }
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [provider, setProvider] = useState<Provider>(settings?.provider ?? 'anthropic')
  const [baseURL, setBaseURL] = useState(settings?.baseURL ?? '')
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState((settings?.models ?? []).join('\n'))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    const json = {
      provider,
      baseURL: baseURL.trim() || null,
      models: models.split('\n').map((model) => model.trim()).filter(Boolean),
      ...(apiKey ? { apiKey } : {}),
      ...(settings ? {} : { tenant: site }),
    }
    try {
      await api(settings ? `assistant-settings/${settings.id}?depth=0` : 'assistant-settings?depth=0', {
        method: settings ? 'PATCH' : 'POST',
        json,
      })
      setApiKey('')
      toast.success(t('savedToast'))
      router.refresh()
    } catch (error) {
      if (error instanceof APIError) setErrors(error.fields)
      toast.error(t('saveFailed'))
    }
    setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardContent>
          <fieldset disabled={!editable} className="contents">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="provider">{t('provider')}</FieldLabel>
                <Select value={provider} onValueChange={(value) => value && setProvider(value as Provider)} disabled={!editable}>
                  <SelectTrigger id="provider" className="w-full sm:w-64">
                    <SelectValue>{(value: Provider) => providers[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(providers) as Provider[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {providers[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={errors.baseURL ? true : undefined}>
                <FieldLabel htmlFor="baseURL">{t('baseURL')}</FieldLabel>
                <Input id="baseURL" type="url" value={baseURL} onChange={(event) => setBaseURL(event.target.value)} />
                <FieldDescription>{t('baseURLDescription')}</FieldDescription>
                <FieldError>{errors.baseURL}</FieldError>
              </Field>
              {editable && (
                <Field data-invalid={errors.apiKey ? true : undefined}>
                  <FieldLabel htmlFor="apiKey">{t('apiKey')}</FieldLabel>
                  <Input id="apiKey" type="password" autoComplete="off" required={!settings} value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
                  <FieldDescription>{t('apiKeyDescription')}</FieldDescription>
                  <FieldError>{errors.apiKey}</FieldError>
                </Field>
              )}
              <Field data-invalid={errors.models ? true : undefined}>
                <FieldLabel htmlFor="models">{t('models')}</FieldLabel>
                <Textarea id="models" required value={models} onChange={(event) => setModels(event.target.value)} className="font-mono" />
                <FieldDescription>{t('modelsDescription')}</FieldDescription>
                <FieldError>{errors.models}</FieldError>
              </Field>
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable && (
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              {t('save')}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  )
}

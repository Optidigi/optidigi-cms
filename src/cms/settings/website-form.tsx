'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'

type Website = { id: number; name: string; slug: string; siteOrigin: string }

export function WebsiteForm({ website }: { website?: Website }) {
  const { t } = useI18n()
  const router = useRouter()
  const [values, setValues] = useState({ name: website?.name ?? '', slug: website?.slug ?? '', siteOrigin: website?.siteOrigin ?? 'https://' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      // The slug field is Payload's native slug field; leaving it empty generates it from the name.
      const json = { name: values.name, siteOrigin: values.siteOrigin, ...(values.slug ? { slug: values.slug } : {}) }
      const result = await api<{ doc: { id: number } }>(website ? `tenants/${website.id}?depth=0` : 'tenants?depth=0', {
        method: website ? 'PATCH' : 'POST',
        json,
      })
      toast.success(t('savedToast'))
      if (website) router.refresh()
      else router.replace(`/admin/platform/websites/${result.doc.id}`)
    } catch (error) {
      if (error instanceof APIError) setErrors(error.fields)
      toast.error(t('saveFailed'))
    }
    setSaving(false)
  }

  const field = (key: keyof typeof values, label: string, props: React.ComponentProps<typeof Input> = {}, description?: string) => (
    <Field data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={key}>{label}</FieldLabel>
      <Input id={key} value={values[key]} aria-invalid={errors[key] ? true : undefined} onChange={(event) => setValues({ ...values, [key]: event.target.value })} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors[key]}</FieldError>
    </Field>
  )

  return (
    <form onSubmit={save}>
      <Card>
        <CardContent>
          <FieldGroup>
            {field('name', t('name'), { required: true })}
            {field('slug', t('slug'))}
            {field('siteOrigin', t('websiteUrl'), { required: true, type: 'url' }, t('websiteUrlDescription'))}
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

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

// Payload's native update of the signed-in user.
export function ProfileForm({ id, email: initialEmail }: { id: number; email: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await api(`users/${id}?depth=0`, { method: 'PATCH', json: { email, ...(password ? { password } : {}) } })
      setPassword('')
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
        <FieldGroup>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" required value={email} aria-invalid={errors.email ? true : undefined} onChange={(event) => setEmail(event.target.value)} />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" value={password} aria-invalid={errors.password ? true : undefined} onChange={(event) => setPassword(event.target.value)} />
            <FieldDescription>{t('passwordDescription')}</FieldDescription>
            <FieldError>{errors.password}</FieldError>
          </Field>
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

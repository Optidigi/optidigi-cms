'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useSave } from '../client/use-save'

// Payload's native update of the signed-in user.
export function ProfileForm({ id, email: initialEmail }: { id: number; email: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const { errors, saving, save: run, invalid, ariaInvalid } = useSave()

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const saved = await run(
      () => api(`users/${id}?depth=0`, { method: 'PATCH', json: { email, ...(password ? { password } : {}) } }),
      t('savedToast'),
    )
    if (saved === undefined) return
    setPassword('')
    router.refresh()
  }

  return (
    <form onSubmit={save}>
    <Card>
      <CardContent>
        <FieldGroup>
          <Field {...invalid('email')}>
            <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" required value={email} {...ariaInvalid('email')} onChange={(event) => setEmail(event.target.value)} />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field {...invalid('password')}>
            <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" value={password} {...ariaInvalid('password')} onChange={(event) => setPassword(event.target.value)} />
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

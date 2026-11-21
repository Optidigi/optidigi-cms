'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      await api('users/reset-password', {
        method: 'POST',
        json: { token, password: new FormData(event.currentTarget).get('password') },
      })
      // Payload signs the user in after a reset; sign out so the new password is used next time.
      await api('users/logout', { method: 'POST' }).catch(() => undefined)
      setDone(true)
    } catch (caught) {
      setError(caught instanceof APIError ? caught.fields.password ?? caught.message : t('saveFailed'))
    }
    setPending(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('resetTitle')}</CardTitle>
        <CardDescription>{t('resetDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <Alert>
            <AlertDescription>{t('passwordSaved')}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={error ? true : undefined} />
                {error && <FieldError>{error}</FieldError>}
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending && <Spinner data-icon="inline-start" />}
                  {t('savePassword')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
        <FieldDescription className="mt-6 text-center">
          <Link href="/admin/login">{t('backToSignIn')}</Link>
        </FieldDescription>
      </CardContent>
    </Card>
  )
}

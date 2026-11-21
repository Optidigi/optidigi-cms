'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'

export function ForgotForm() {
  const { t } = useI18n()
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    // Payload answers the same way whether or not the account exists.
    await api('users/forgot-password', {
      method: 'POST',
      json: { email: new FormData(event.currentTarget).get('email') },
    }).catch(() => undefined)
    setSent(true)
    setPending(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('forgotTitle')}</CardTitle>
        <CardDescription>{t('forgotDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <Alert>
            <AlertDescription>{t('resetLinkSent')}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username" required />
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending && <Spinner data-icon="inline-start" />}
                  {t('sendResetLink')}
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

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useHydrated } from '../client/use-hydrated'

export function ForgotForm({ email }: { email?: string }) {
  const { t } = useI18n()
  // Until React handles the submit, the button stays off so the browser never sends the form itself.
  const hydrated = useHydrated()
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
    // The form of the official shadcn login-04 block: a centred heading above the fields.
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">{t('forgotTitle')}</h1>
        <p className="text-sm text-balance text-muted-foreground">{t('forgotDescription')}</p>
      </div>
        {sent ? (
          <Alert>
            <AlertDescription>{t('resetLinkSent')}</AlertDescription>
          </Alert>
        ) : (
          <form method="post" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={email} />
              </Field>
              <Field>
                <Button type="submit" disabled={pending || !hydrated}>
                  {pending && <Spinner data-icon="inline-start" />}
                  {t('sendResetLink')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
        <FieldDescription className="text-center">
          <Link href="/admin/login">{t('backToSignIn')}</Link>
        </FieldDescription>
    </div>
  )
}

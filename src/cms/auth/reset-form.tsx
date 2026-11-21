'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from './password-input'
import { Spinner } from '@/components/ui/spinner'
import { api, APIError } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useHydrated } from '../client/use-hydrated'

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n()
  // Until React handles the submit, the button stays off so the browser never sends the form itself.
  const hydrated = useHydrated()
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
    // The form of the official shadcn login-02 block: a centred heading above the fields.
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">{t('resetTitle')}</h1>
        <p className="text-sm text-balance text-muted-foreground">{t('resetDescription')}</p>
      </div>
        {done ? (
          <Alert>
            <AlertDescription>{t('passwordSaved')}</AlertDescription>
          </Alert>
        ) : (
          <form method="post" onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
                <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={error ? true : undefined} />
                {error && <FieldError>{error}</FieldError>}
              </Field>
              <Field>
                <Button type="submit" disabled={pending || !hydrated}>
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
    </div>
  )
}

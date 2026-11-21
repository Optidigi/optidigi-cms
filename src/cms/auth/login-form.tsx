'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from './password-input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useHydrated } from '../client/use-hydrated'

export function LoginForm({ destination }: { destination: string }) {
  const { t } = useI18n()
  // Until React handles the submit, the button stays off so the browser never sends the form itself.
  const hydrated = useHydrated()
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(false)
    try {
      await api('users/login', { method: 'POST', json: { email: form.get('email'), password: form.get('password') } })
      // A full navigation, because the destination can be an API route in Payload's MCP OAuth flow.
      window.location.assign(destination)
    } catch {
      setError(true)
      setPending(false)
    }
  }

  return (
    // The form of the official shadcn login-02 block: a centred heading above the fields.
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">{t('signInTitle')}</h1>
        <p className="text-sm text-balance text-muted-foreground">{t('signInDescription')}</p>
      </div>
        <form method="post" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={error || undefined}>
              <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={error || undefined} />
            </Field>
            <Field data-invalid={error || undefined}>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                <Link href="/admin/forgot" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={error || undefined} />
              {error && <FieldError>{t('signInFailed')}</FieldError>}
            </Field>
            <Field>
              <Button type="submit" disabled={pending || !hydrated}>
                {pending && <Spinner data-icon="inline-start" />}
                {t('signIn')}
              </Button>
            </Field>
          </FieldGroup>
        </form>
    </div>
  )
}

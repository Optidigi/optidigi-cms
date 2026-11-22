'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { useHydrated } from '../client/use-hydrated'
import { PasswordInput } from './password-input'

// Signing in takes two steps in the same card: the email address, then the password. Step one only
// checks the address's format, so the screen never tells whether an account exists; Payload checks
// both together on the last step.
export function LoginForm({ destination }: { destination: string }) {
  const { t } = useI18n()
  // Until React handles the submit, the button stays off so the browser never sends the form itself.
  const hydrated = useHydrated()
  const [step, setStep] = useState<'email' | 'password'>('email')
  // The direction the content slides in from: forward to the password, back to the email.
  const [back, setBack] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'email') {
      setBack(false)
      setError(false)
      setStep('password')
      return
    }
    setPending(true)
    setError(false)
    try {
      await api('users/login', { method: 'POST', json: { email, password: new FormData(event.currentTarget).get('password') } })
      // A full navigation, because the destination can be an API route in Payload's MCP OAuth flow.
      window.location.assign(destination)
    } catch {
      setError(true)
      setPending(false)
    }
  }

  function changeEmail() {
    setBack(true)
    setError(false)
    setStep('email')
  }

  return (
    <form method="post" onSubmit={submit}>
      <div
        key={step}
        className={cn(
          'flex flex-col gap-6 duration-300 animate-in fade-in-0 motion-reduce:animate-none',
          back ? 'slide-in-from-left-4' : step === 'password' && 'slide-in-from-right-4',
        )}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t(step === 'email' ? 'signInTitle' : 'passwordTitle')}</h1>
          {step === 'email' ? (
            <p className="text-sm text-balance text-muted-foreground">{t('signInEmailDescription')}</p>
          ) : (
            <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground">
              <span className="break-all">{email}</span>
              <Button type="button" variant="link" size="sm" className="h-auto p-0" aria-label={t('otherEmail')} onClick={changeEmail}>
                {t('change')}
              </Button>
            </p>
          )}
        </div>
        {step === 'email' ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value.trim())}
              />
            </Field>
            <Field>
              <Button type="submit" disabled={!hydrated}>
                {t('continue')}
              </Button>
            </Field>
          </FieldGroup>
        ) : (
          <FieldGroup>
            {/* Password managers pair the password with this address. */}
            <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
            <Field data-invalid={error || undefined}>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                <Link
                  href={`/admin/forgot?email=${encodeURIComponent(email)}`}
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <PasswordInput id="password" name="password" autoComplete="current-password" required autoFocus aria-invalid={error || undefined} />
              {error && <FieldError>{t('signInFailed')}</FieldError>}
            </Field>
            <Field>
              <Button type="submit" disabled={pending || !hydrated}>
                {pending && <Spinner data-icon="inline-start" />}
                {t('signIn')}
              </Button>
            </Field>
          </FieldGroup>
        )}
      </div>
    </form>
  )
}

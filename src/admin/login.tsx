'use client'

import { useAdminTranslations } from '@/admin/i18n-context'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loginDestination } from './login-destination'

export function AdminLogin({ next }: { next?: string }) {
  const t = useAdminTranslations()
  const ready = useHydrated()
  const [email, setEmail] = useState('')
  const [invalid, setInvalid] = useState<Partial<Record<'email' | 'password', boolean>>>({})

  const [error, action, pending] = useActionState(async (_error: string, form: FormData) => {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      if (response.ok) {
        window.location.assign(loginDestination(next))
        return ''
      }
      if (response.status >= 500)
        return 'Inloggen is tijdelijk niet beschikbaar. Probeer het opnieuw.'
    } catch {
      return 'Inloggen is tijdelijk niet beschikbaar. Probeer het opnieuw.'
    }
    return 'Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord.'
  }, '')
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl tracking-tight">{t('Inloggen')}</h1>
        </CardTitle>
        <CardDescription>{t('Gebruik je Optidigi CMS-account.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {error && (
              <Alert role="alert" variant="destructive">
                <AlertDescription>{t(error)}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={invalid.email || undefined}>
              <FieldLabel htmlFor="email">{t('E-mailadres')}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setInvalid((value) => ({ ...value, email: false }))
                }}
                onInvalid={(event) => {
                  event.preventDefault()
                  setInvalid((value) => ({ ...value, email: true }))
                }}
                aria-invalid={invalid.email}
                aria-describedby={invalid.email ? 'login-email-error' : undefined}
                required
                disabled={pending || !ready}
              />
              {invalid.email && (
                <FieldError id="login-email-error">
                  {t('Vul een geldig e-mailadres in.')}
                </FieldError>
              )}
            </Field>
            <Field data-invalid={invalid.password || undefined}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="password">{t('Wachtwoord')}</FieldLabel>
                <Link href="/admin/forgot" className="text-sm underline-offset-4 hover:underline">
                  {t('Wachtwoord vergeten?')}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                onChange={() => setInvalid((value) => ({ ...value, password: false }))}
                onInvalid={(event) => {
                  event.preventDefault()
                  setInvalid((value) => ({ ...value, password: true }))
                }}
                aria-invalid={invalid.password}
                aria-describedby={invalid.password ? 'login-password-error' : undefined}
                required
                disabled={pending || !ready}
              />
              {invalid.password && (
                <FieldError id="login-password-error">{t('Vul je wachtwoord in.')}</FieldError>
              )}
            </Field>
            <Button type="submit" disabled={pending || !ready}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? t('Bezig met inloggen…') : t('Inloggen')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

'use client'

import { useComparisonTranslations } from '@/admin-comparison/i18n-context'

import Link from 'next/link'
import { useActionState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { signInComparison } from './session'

export function ComparisonLogin() {
  const t = useComparisonTranslations()

  const [error, action, pending] = useActionState(signInComparison, '')
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
              <Alert variant="destructive">
                <AlertDescription>{t(error)}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="email">{t('E-mailadres')}</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t('Wachtwoord')}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? t('Bezig met inloggen…') : t('Inloggen')}
            </Button>
            <Link href="/admin/forgot" className="text-sm text-muted-foreground hover:underline">
              {t('Wachtwoord vergeten?')}
            </Link>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

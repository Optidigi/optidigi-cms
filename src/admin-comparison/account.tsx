'use client'

import { useComparisonTranslations } from '@/admin-comparison/i18n-context'

import { useActionState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { saveAccount } from './admin-actions'

export function AccountForm({ email }: { email: string }) {
  const t = useComparisonTranslations()

  const [message, action, pending] = useActionState(saveAccount, '')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Inloggegevens')}</CardTitle>
        <CardDescription>
          {t('Bevestig je huidige wachtwoord. Na een wijziging log je opnieuw in.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {message && (
              <Alert>
                <AlertDescription>{t(message)}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="account-email">{t('E-mailadres')}</FieldLabel>
              <Input
                id="account-email"
                name="email"
                type="email"
                autoComplete="username"
                defaultValue={email}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="current-password">{t('Huidig wachtwoord')}</FieldLabel>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">{t('Nieuw wachtwoord')}</FieldLabel>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                placeholder={t('Leeg laten om je wachtwoord te behouden')}
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? t('Opslaan…') : t('Wijzigingen opslaan')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

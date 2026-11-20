'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { signInComparison } from './session'

export function ComparisonLogin() {
  const [error, action, pending] = useActionState(signInComparison, '')
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl tracking-tight">Inloggen</h1>
        </CardTitle>
        <CardDescription>Gebruik je Optidigi CMS-account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="email">E-mailadres</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Wachtwoord</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? 'Bezig met inloggen…' : 'Inloggen'}
            </Button>
            <Link href="/admin/forgot" className="text-sm text-muted-foreground hover:underline">
              Wachtwoord vergeten?
            </Link>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

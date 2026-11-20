import { Alert, AlertDescription } from '@/studio/ui/alert'
import { Button } from '@/studio/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/studio/ui/card'
import { Input } from '@/studio/ui/input'
import { Label } from '@/studio/ui/label'
import { signIn } from '@/studio/actions'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Optidigi Studio</CardTitle>
          <CardDescription>Log in om je websites te beheren.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>Inloggen is mislukt. Controleer je gegevens.</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit">Inloggen</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

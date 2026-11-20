import { Globe2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ComparisonLogin } from '@/admin-comparison/login'
import { AppearanceMenu } from '@/admin-comparison/theme'
import { comparisonSession } from '@/admin-comparison/data'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>
}) {
  if (await comparisonSession()) redirect('/admin-shadcn')
  const accountUpdated = (await searchParams).updated === '1'
  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between p-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Globe2 className="size-4" />
          </span>
          Optidigi CMS
        </span>
        <AppearanceMenu />
      </header>
      <div className="grid place-items-center px-6 pb-16">
        <div className="w-full max-w-sm space-y-3">
          {accountUpdated && (
            <Alert>
              <AlertDescription>Inloggegevens opgeslagen. Log opnieuw in.</AlertDescription>
            </Alert>
          )}
          <ComparisonLogin />
        </div>
      </div>
    </main>
  )
}

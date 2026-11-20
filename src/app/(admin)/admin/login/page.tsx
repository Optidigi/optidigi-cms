import { InterfaceLanguageMenu } from '@/admin/language-menu'

import { adminTranslations } from '@/admin/i18n-server'
import { Globe2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AdminLogin } from '@/admin/login'
import { AppearanceMenu } from '@/admin/theme'
import { loginDestination } from '@/admin/login-destination'
import { adminSession } from '@/admin/data'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; redirect?: string }>
}) {
  const t = await adminTranslations()

  const query = await searchParams
  if (await adminSession()) redirect(loginDestination(query.redirect))
  const accountUpdated = query.updated === '1'
  return (
    <main className="relative grid min-h-svh grid-rows-[auto_1fr] bg-muted">
      <header className="flex justify-end gap-1 px-4 py-3 sm:px-6">
        <InterfaceLanguageMenu />
        <AppearanceMenu />
      </header>
      <div className="grid place-items-center px-4 pb-12 sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 self-center font-semibold">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Globe2 className="size-4" aria-hidden />
            </span>
            Optidigi CMS
          </div>
          {accountUpdated && (
            <Alert role="status">
              <AlertDescription>{t('Inloggegevens opgeslagen. Log opnieuw in.')}</AlertDescription>
            </Alert>
          )}
          <AdminLogin next={query.redirect} />
        </div>
      </div>
    </main>
  )
}

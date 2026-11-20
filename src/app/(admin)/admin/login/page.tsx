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
    <main className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between p-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Globe2 className="size-4" />
          </span>
          Optidigi CMS
        </span>
        <div className="flex items-center gap-1">
          <InterfaceLanguageMenu />
          <AppearanceMenu />
        </div>
      </header>
      <div className="grid place-items-center px-6 pb-16">
        <div className="w-full max-w-sm space-y-3">
          {accountUpdated && (
            <Alert>
              <AlertDescription>{t('Inloggegevens opgeslagen. Log opnieuw in.')}</AlertDescription>
            </Alert>
          )}
          <AdminLogin next={query.redirect} />
        </div>
      </div>
    </main>
  )
}

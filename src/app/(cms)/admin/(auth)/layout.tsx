import { Card, CardContent } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { AuthLanguageMenu } from '@/cms/auth/auth-language-menu'
import { brandMark, brandWordmark } from '@/cms/brand'
import { getTranslator } from '@/cms/server'

// Layout of the official shadcn login-04 block: one card on a muted page, the form on the left and
// a picture on the right. The picture is Optidigi's own mark on its dark brand colour.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslator()
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <AuthLanguageMenu />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6 md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:min-h-[30rem] md:grid-cols-2">
            <div className="flex flex-col gap-8 p-6 md:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline brand SVG */}
              <img src={brandWordmark} alt={t('appName')} className="h-6 w-auto self-center dark:invert" />
              <div className="flex flex-1 flex-col justify-center">{children}</div>
            </div>
            <div className="relative hidden flex-col items-center justify-center gap-6 overflow-hidden bg-[#09090b] p-10 md:flex">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(5_170_116/0.28),transparent_60%)]" />
              {/* eslint-disable-next-line @next/next/no-img-element -- inline brand SVG */}
              <img src={brandMark} alt="" className="relative size-28 drop-shadow-2xl" />
              <div className="relative flex flex-col gap-2 text-center">
                <p className="text-xl font-semibold text-white">{t('authCoverTitle')}</p>
                <p className="text-sm text-balance text-white/60">{t('authCoverDescription')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">{t('signInHelp')}</FieldDescription>
      </div>
    </div>
  )
}

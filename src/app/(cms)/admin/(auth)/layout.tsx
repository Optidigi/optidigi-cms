import { FieldDescription } from '@/components/ui/field'
import { AuthLanguageMenu } from '@/cms/auth/auth-language-menu'
import { brandMark, brandWordmark } from '@/cms/brand'
import { getTranslator } from '@/cms/server'

// Layout of the official shadcn login-02 block: the form on the left, a cover on the right. The
// cover holds Optidigi's own mark on its dark brand colour instead of a photo.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslator()
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline brand SVG */}
          <img src={brandWordmark} alt={t('appName')} className="h-6 w-auto dark:invert" />
          <AuthLanguageMenu />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-6">
            {children}
            <FieldDescription className="text-center">{t('signInHelp')}</FieldDescription>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#09090b] lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:p-10">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(5_170_116/0.28),transparent_60%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- inline brand SVG */}
        <img src={brandMark} alt="" className="relative size-40 drop-shadow-2xl" />
        <div className="relative flex max-w-sm flex-col gap-2 text-center">
          <p className="text-2xl font-semibold text-white">{t('authCoverTitle')}</p>
          <p className="text-sm text-balance text-white/60">{t('authCoverDescription')}</p>
        </div>
      </div>
    </div>
  )
}

import { Card, CardContent } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { AuthLanguageMenu } from '@/cms/auth/auth-language-menu'
import { getBrand, getTranslator } from '@/cms/server'
import { BrandLogo } from '@/cms/shell/brand-logo'

// Layout of the official shadcn login-04 block: one card on a muted page, the form on the left and
// a picture on the right. The picture is the CMS brand's logo (Platform → Websites), following light
// and dark mode; without one, the app name.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [t, brand] = await Promise.all([getTranslator(), getBrand()])
  const logo = (className: string) =>
    brand ? (
      <BrandLogo name={brand.name} logo={brand.logo} logoDark={brand.logoDark} className={className} />
    ) : (
      <span className="font-heading text-xl font-semibold tracking-tight">{t('appName')}</span>
    )
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <AuthLanguageMenu />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6 md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:min-h-[30rem] md:grid-cols-2">
            <div className="flex flex-col gap-8 p-6 md:p-8">
              {/* On small screens the picture is hidden, so the logo sits above the form. */}
              <div className="flex justify-center md:hidden">{logo('h-6')}</div>
              <div className="flex flex-1 flex-col justify-center">{children}</div>
            </div>
            <div className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden bg-muted p-10 md:flex dark:bg-[#09090b]">
              <div aria-hidden className="absolute inset-0 hidden bg-[radial-gradient(circle_at_50%_40%,rgb(5_170_116/0.28),transparent_60%)] dark:block" />
              <div className="relative flex justify-center">{logo('h-10 object-center')}</div>
              <div className="relative flex flex-col gap-2 text-center">
                <p className="text-xl font-semibold">{t('authCoverTitle')}</p>
                <p className="text-sm text-balance text-muted-foreground">{t('authCoverDescription')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">{t('signInHelp')}</FieldDescription>
      </div>
    </div>
  )
}

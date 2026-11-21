import { LayoutGridIcon } from 'lucide-react'
import { FieldDescription } from '@/components/ui/field'
import { getTranslator } from '@/cms/server'

// Layout of the official shadcn login-03 block: the product name above a centred card.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslator()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGridIcon className="size-4" />
          </div>
          {t('appName')}
        </div>
        {children}
        <FieldDescription className="px-6 text-center">{t('signInHelp')}</FieldDescription>
      </div>
    </div>
  )
}

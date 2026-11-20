import type { Metadata } from 'next'
import { getInterfaceLanguage } from '@/admin-comparison/i18n-server'
import { InterfaceLanguageProvider } from '@/admin-comparison/i18n-context'
import { ComparisonTheme } from '@/admin-comparison/theme'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import './comparison.css'

export const metadata: Metadata = {
  title: 'Optidigi CMS',
  robots: { index: false, follow: false },
}

export default async function ComparisonLayout({ children }: { children: ReactNode }) {
  const language = await getInterfaceLanguage()
  return (
    <html lang={language} className={GeistSans.variable} suppressHydrationWarning>
      <body>
        <ComparisonTheme>
          <TooltipProvider>
            <InterfaceLanguageProvider language={language}>{children}</InterfaceLanguageProvider>
          </TooltipProvider>
        </ComparisonTheme>
      </body>
    </html>
  )
}

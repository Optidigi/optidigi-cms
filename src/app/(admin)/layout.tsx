import type { Metadata } from 'next'
import { getInterfaceLanguage } from '@/admin/i18n-server'
import { InterfaceLanguageProvider } from '@/admin/i18n-context'
import { AdminTheme } from '@/admin/theme'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import './admin.css'

export const metadata: Metadata = {
  title: 'Optidigi CMS',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const language = await getInterfaceLanguage()
  return (
    <html lang={language} className={GeistSans.variable} suppressHydrationWarning>
      <body>
        <AdminTheme>
          <TooltipProvider>
            <InterfaceLanguageProvider language={language}>{children}</InterfaceLanguageProvider>
          </TooltipProvider>
        </AdminTheme>
      </body>
    </html>
  )
}

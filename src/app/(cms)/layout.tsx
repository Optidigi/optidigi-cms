import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/cms/client/i18n-provider'
import { ThemeProvider } from '@/cms/client/theme-provider'
import { getLanguage, getPreferences, getSession } from '@/cms/server'
import './admin.css'

export const metadata: Metadata = { title: { default: 'Optidigi CMS', template: '%s · Optidigi CMS' } }

export default async function CMSRootLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()
  const { user } = await getSession()
  const theme = user ? (await getPreferences()).theme : 'system'
  return (
    <html lang={language} className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme={theme} enableSystem disableTransitionOnChange>
          <I18nProvider language={language}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

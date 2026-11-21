import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { I18nProvider } from '@/cms/client/i18n-provider'
import { ThemeProvider } from '@/cms/client/theme-provider'
import { atkinson, inter } from '@/cms/fonts'
import { appearanceAttributes, defaultAppearance } from '@/cms/preferences'
import { getLanguage, getPreferences, getSession } from '@/cms/server'
import './admin.css'

export const metadata: Metadata = { title: { default: 'Optidigi CMS', template: '%s · Optidigi CMS' } }

export default async function CMSRootLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()
  const { user } = await getSession()
  // Signed-in users get their own appearance; the sign-in screens keep the default look.
  const preferences = user ? await getPreferences() : undefined
  const theme = preferences?.theme ?? 'system'
  return (
    <html
      lang={language}
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${atkinson.variable}`}
      {...appearanceAttributes(preferences ?? defaultAppearance)}
      suppressHydrationWarning
    >
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

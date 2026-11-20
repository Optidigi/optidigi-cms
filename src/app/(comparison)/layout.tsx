import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import './comparison.css'

export const metadata: Metadata = {
  title: 'Optidigi CMS',
  robots: { index: false, follow: false },
}

export default function ComparisonLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={GeistSans.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}

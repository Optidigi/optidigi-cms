import type { ReactNode } from 'react'
import './studio.css'

export const metadata = { title: { default: 'Optidigi Studio', template: '%s | Optidigi Studio' } }

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}

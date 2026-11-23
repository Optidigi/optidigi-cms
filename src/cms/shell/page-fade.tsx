'use client'

import { usePathname } from 'next/navigation'

// Each page fades in when it opens. Keyed on the path, so saving (router.refresh) and changing
// filters or search (search params) don't replay it; the sidebar outside it stays put. Opacity
// only: a transform would knock the sticky header and save bar off position while it runs.
// Reduced motion cuts it short (admin.css).
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="flex min-w-0 flex-1 flex-col animate-page-in">
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'
import { currentSite } from '@/admin/data'

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ site: string }>
}) {
  await currentSite((await params).site)
  return children
}

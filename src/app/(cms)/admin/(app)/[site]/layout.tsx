import { requireSite } from '@/cms/server'

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ site: string }>
}) {
  await requireSite((await params).site)
  return children
}

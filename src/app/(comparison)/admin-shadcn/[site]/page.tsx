import { redirect } from 'next/navigation'
import { adminRoot, currentSite } from '@/admin-comparison/data'

export default async function SitePage({ params }: { params: Promise<{ site: string }> }) {
  const { selected } = await currentSite((await params).site)
  redirect(adminRoot + '/' + selected.id + '/pages')
}
